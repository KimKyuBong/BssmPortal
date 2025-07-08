import os
import datetime
import zipfile
import io
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.conf import settings
from django.utils import timezone
from .models import CertificateAuthority, SslCertificate, CustomDnsRecord
import logging
import idna

logger = logging.getLogger(__name__)

class CertificateManager:
    """SSL 인증서 관리 클래스"""
    
    def __init__(self):
        self.ca_dir = getattr(settings, 'SSL_CA_DIR', '/etc/ssl/ca')
        self.cert_dir = getattr(settings, 'SSL_CERT_DIR', '/etc/ssl/certs')
        self.key_dir = getattr(settings, 'SSL_KEY_DIR', '/etc/ssl/private')
        
        # 디렉토리 생성
        os.makedirs(self.ca_dir, mode=0o755, exist_ok=True)
        os.makedirs(self.cert_dir, mode=0o755, exist_ok=True)
        os.makedirs(self.key_dir, mode=0o700, exist_ok=True)
    
    def create_ca(self, ca_name="BSSM Internal CA", validity_days=None):
        """내부 CA 생성 (이미 있으면 예외 발생)"""
        # 이미 CA가 존재하면 재생성 금지
        existing_ca = CertificateAuthority.objects.filter(is_active=True).first()
        if existing_ca:
            raise Exception("이미 활성화된 CA가 존재합니다. CA 재생성은 금지되어 있습니다.")
        if validity_days is None:
            validity_days = getattr(settings, 'SSL_CA_VALIDITY_DAYS', 36500)  # 기본 100년
            
        try:
            # CA 개인키 생성
            ca_private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=4096,
            )
            
            # CA 인증서 생성
            subject = issuer = x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "KR"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Busan"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "Gangseo-gu"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Busan Software Meister School"),
                x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "IT Department"),
                x509.NameAttribute(NameOID.COMMON_NAME, ca_name),
            ])
            
            ca_cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                issuer
            ).public_key(
                ca_private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.datetime.utcnow()
            ).not_valid_after(
                datetime.datetime.utcnow() + datetime.timedelta(days=validity_days)
            ).add_extension(
                x509.SubjectKeyIdentifier.from_public_key(ca_private_key.public_key()),
                critical=False,
            ).add_extension(
                x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_private_key.public_key()),
                critical=False,
            ).add_extension(
                x509.BasicConstraints(ca=True, path_length=0),
                critical=True,
            ).add_extension(
                x509.KeyUsage(
                    digital_signature=True,
                    content_commitment=False,
                    key_encipherment=False,
                    data_encipherment=False,
                    key_agreement=False,
                    key_cert_sign=True,
                    crl_sign=True,
                    encipher_only=False,
                    decipher_only=False,
                ),
                critical=True,
            ).add_extension(
                x509.ExtendedKeyUsage([
                    ExtendedKeyUsageOID.CLIENT_AUTH,
                    ExtendedKeyUsageOID.SERVER_AUTH,
                ]),
                critical=False,
            ).add_extension(
                x509.AuthorityInformationAccess([
                    x509.AccessDescription(
                        access_method=x509.oid.AuthorityInformationAccessOID.OCSP,
                        access_location=x509.UniformResourceIdentifier(
                            getattr(settings, 'OCSP_URL', 'http://localhost:8000/dns/ocsp/')
                        )
                    )
                ]),
                critical=False,
            ).sign(ca_private_key, hashes.SHA256())
            
            # PEM 형식으로 변환
            ca_cert_pem = ca_cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
            ca_key_pem = ca_private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            # 데이터베이스에 저장
            ca_obj, created = CertificateAuthority.objects.get_or_create(
                name=ca_name,
                defaults={
                    'certificate': ca_cert_pem,
                    'private_key': ca_key_pem,
                    'is_active': True
                }
            )
            
            # 파일로도 저장
            ca_cert_path = os.path.join(self.ca_dir, f'{ca_name.lower().replace(" ", "_")}.crt')
            ca_key_path = os.path.join(self.ca_dir, f'{ca_name.lower().replace(" ", "_")}.key')
            
            with open(ca_cert_path, 'w') as f:
                f.write(ca_cert_pem)
            
            with open(ca_key_path, 'w') as f:
                f.write(ca_key_pem)
            
            os.chmod(ca_key_path, 0o600)
            
            logger.info(f"CA 생성 완료: {ca_name} (유효기간: {validity_days}일)")
            return ca_obj, created
            
        except Exception as e:
            logger.error(f"CA 생성 실패: {e}")
            raise
    
    def get_active_ca(self):
        """활성화된 CA 가져오기"""
        ca = CertificateAuthority.objects.filter(is_active=True).first()
        if not ca:
            # CA가 없으면 생성
            ca, _ = self.create_ca()
        return ca
    
    def generate_certificate(self, domain, dns_record, validity_days=None):
        """도메인용 SSL 인증서 생성"""
        if validity_days is None:
            validity_days = getattr(settings, 'SSL_DEFAULT_VALIDITY_DAYS', 36500)  # 기본 100년
            
        try:
            ca = self.get_active_ca()
            
            # CA 인증서와 키 로드
            ca_cert = x509.load_pem_x509_certificate(ca.certificate.encode('utf-8'))
            ca_private_key = serialization.load_pem_private_key(
                ca.private_key.encode('utf-8'),
                password=None
            )
            
            # 서버 개인키 생성
            server_private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
            )
            
            # 서버 인증서 생성
            subject = x509.Name([
                x509.NameAttribute(NameOID.COUNTRY_NAME, "KR"),
                x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Busan"),
                x509.NameAttribute(NameOID.LOCALITY_NAME, "Busanjin-gu"),
                x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Busan Software Meister School"),
                x509.NameAttribute(NameOID.COMMON_NAME, domain),
            ])
            
            # SAN (Subject Alternative Names) 설정 - 한글 도메인 지원
            try:
                # 한글 도메인을 punycode로 변환
                ascii_domain = idna.encode(domain).decode('ascii')
            except (idna.core.IDNAError, UnicodeError):
                # 이미 ASCII인 경우 그대로 사용
                ascii_domain = domain
            
            san_list = [x509.DNSName(ascii_domain)]
            
            # www 서브도메인 추가
            if not domain.startswith('www.'):
                try:
                    www_domain = f'www.{domain}'
                    ascii_www_domain = idna.encode(www_domain).decode('ascii')
                    san_list.append(x509.DNSName(ascii_www_domain))
                except (idna.core.IDNAError, UnicodeError):
                    san_list.append(x509.DNSName(f'www.{domain}'))
            
            # IP 주소도 SAN에 추가
            try:
                import ipaddress
                ip_obj = ipaddress.ip_address(dns_record.ip)
                san_list.append(x509.IPAddress(ip_obj))
            except ValueError:
                pass
            
            # 시리얼 번호 생성
            serial_number = x509.random_serial_number()
            
            # OCSP URL 설정 (내부 서버 주소)
            ocsp_url = getattr(settings, 'OCSP_URL', 'http://localhost:8000/dns/ocsp/')
            
            server_cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                ca_cert.subject
            ).public_key(
                server_private_key.public_key()
            ).serial_number(
                serial_number
            ).not_valid_before(
                datetime.datetime.utcnow()
            ).not_valid_after(
                datetime.datetime.utcnow() + datetime.timedelta(days=validity_days)
            ).add_extension(
                x509.SubjectKeyIdentifier.from_public_key(server_private_key.public_key()),
                critical=False,
            ).add_extension(
                x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_private_key.public_key()),
                critical=False,
            ).add_extension(
                x509.BasicConstraints(ca=False, path_length=None),
                critical=True,
            ).add_extension(
                x509.KeyUsage(
                    digital_signature=True,
                    content_commitment=False,
                    key_encipherment=True,
                    data_encipherment=False,
                    key_agreement=False,
                    key_cert_sign=False,
                    crl_sign=False,
                    encipher_only=False,
                    decipher_only=False,
                ),
                critical=True,
            ).add_extension(
                x509.ExtendedKeyUsage([
                    ExtendedKeyUsageOID.SERVER_AUTH,
                ]),
                critical=True,
            ).add_extension(
                x509.SubjectAlternativeName(san_list),
                critical=False,
            ).add_extension(
                x509.AuthorityInformationAccess([
                    x509.AccessDescription(
                        access_method=x509.oid.AuthorityInformationAccessOID.OCSP,
                        access_location=x509.UniformResourceIdentifier(ocsp_url)
                    )
                ]),
                critical=False,
            ).sign(ca_private_key, hashes.SHA256())
            
            # PEM 형식으로 변환
            server_cert_pem = server_cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
            
            # 만료일 계산
            expires_at = timezone.now() + datetime.timedelta(days=validity_days)
            
            # 데이터베이스에 저장 (개인키는 저장하지 않음)
            ssl_cert, created = SslCertificate.objects.update_or_create(
                dns_record=dns_record,
                defaults={
                    'domain': domain,
                    'certificate': server_cert_pem,
                    'certificate_chain': ca.certificate,
                    'serial_number': str(serial_number),
                    'status': '활성',
                    'expires_at': expires_at
                }
            )
            
            # 인증서 파일만 저장 (개인키는 저장하지 않음)
            cert_path = os.path.join(self.cert_dir, f'{domain}.crt')
            chain_path = os.path.join(self.cert_dir, f'{domain}_chain.crt')
            
            with open(cert_path, 'w') as f:
                f.write(server_cert_pem)
            
            with open(chain_path, 'w') as f:
                f.write(server_cert_pem + ca.certificate)
            
            logger.info(f"SSL 인증서 생성 완료: {domain} (유효기간: {validity_days}일)")
            return ssl_cert
            
        except Exception as e:
            logger.error(f"SSL 인증서 생성 실패 ({domain}): {e}")
            # 오류 상태로 업데이트
            if 'ssl_cert' in locals():
                ssl_cert.status = '오류'
                ssl_cert.save()
            raise
    
    def revoke_certificate(self, ssl_cert):
        """인증서 취소"""
        try:
            # 파일 삭제
            domain = ssl_cert.domain
            cert_path = os.path.join(self.cert_dir, f'{domain}.crt')
            chain_path = os.path.join(self.cert_dir, f'{domain}_chain.crt')
            
            for path in [cert_path, chain_path]:
                if os.path.exists(path):
                    os.remove(path)
            
            # 데이터베이스에서 상태를 '폐기'로 변경하고 폐기일 기록
            ssl_cert.status = '폐기'
            ssl_cert.revoked_at = timezone.now()
            ssl_cert.save()
            
            logger.info(f"SSL 인증서 취소 완료: {domain}")
            
        except Exception as e:
            logger.error(f"SSL 인증서 취소 실패: {e}")
            raise
    
    def check_expiring_certificates(self, days_threshold=30):
        """만료 예정 인증서 확인"""
        threshold_date = timezone.now() + datetime.timedelta(days=days_threshold)
        expiring_certs = SslCertificate.objects.filter(
            expires_at__lte=threshold_date,
            status='활성'
        )
        return expiring_certs
    
    def renew_certificate(self, ssl_cert, validity_days=None):
        """인증서 갱신"""
        if validity_days is None:
            validity_days = getattr(settings, 'SSL_DEFAULT_VALIDITY_DAYS', 36500)  # 기본 100년
            
        try:
            domain = ssl_cert.domain
            dns_record = ssl_cert.dns_record
            
            # 기존 인증서 삭제
            self.revoke_certificate(ssl_cert)
            
            # 새 인증서 생성
            new_cert = self.generate_certificate(domain, dns_record, validity_days)
            
            logger.info(f"SSL 인증서 갱신 완료: {domain}")
            return new_cert
            
        except Exception as e:
            logger.error(f"SSL 인증서 갱신 실패: {e}")
            raise

def generate_ssl_certificate(domain, dns_record):
    """SSL 인증서 생성 함수"""
    manager = CertificateManager()
    return manager.generate_certificate(domain, dns_record)

def revoke_ssl_certificate(ssl_cert):
    """SSL 인증서 취소 함수"""
    manager = CertificateManager()
    return manager.revoke_certificate(ssl_cert)

def check_expiring_certificates(days_threshold=30):
    """만료 예정 인증서 확인 함수"""
    manager = CertificateManager()
    return manager.check_expiring_certificates(days_threshold)

def renew_ssl_certificate(ssl_cert):
    """SSL 인증서 갱신 함수"""
    manager = CertificateManager()
    return manager.renew_certificate(ssl_cert)

def create_ssl_package(domain: str, dns_record: CustomDnsRecord) -> bytes:
    """SSL 인증서 패키지를 ZIP 파일로 생성 (개인키는 임시 생성 후 즉시 삭제)"""
    try:
        # SSL 인증서 생성 또는 가져오기
        ssl_cert = None
        if hasattr(dns_record, 'ssl_certificate') and dns_record.ssl_certificate:
            ssl_cert = dns_record.ssl_certificate
            if ssl_cert.is_expired() or ssl_cert.status != '활성':
                ssl_cert.delete()
                ssl_cert = None
        
        if not ssl_cert:
            ssl_cert = generate_ssl_certificate(domain, dns_record)
        
        # CA 인증서 가져오기
        ca = CertificateAuthority.objects.filter(is_active=True).first()
        if not ca:
            raise Exception("CA 인증서를 찾을 수 없습니다.")
        
        # 개인키 임시 생성 (기존 인증서와 매칭되는 키)
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        
        # 기존 인증서에서 공개키 추출하여 개인키 재생성
        cert = x509.load_pem_x509_certificate(ssl_cert.certificate.encode('utf-8'))
        
        # 새로운 개인키 생성 (매번 다르게)
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        # 새로운 인증서 생성 (기존과 동일한 정보로)
        ca_cert = x509.load_pem_x509_certificate(ca.certificate.encode('utf-8'))
        ca_private_key = serialization.load_pem_private_key(
            ca.private_key.encode('utf-8'),
            password=None
        )
        
        # 새로운 인증서 생성
        new_cert = x509.CertificateBuilder().subject_name(
            cert.subject
        ).issuer_name(
            ca_cert.subject
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()  # 새로운 시리얼 번호
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=36500)  # 100년
        ).add_extension(
            x509.SubjectKeyIdentifier.from_public_key(private_key.public_key()),
            critical=False,
        ).add_extension(
            x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_private_key.public_key()),
            critical=False,
        ).add_extension(
            x509.BasicConstraints(ca=False, path_length=None),
            critical=True,
        ).add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=True,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        ).add_extension(
            x509.ExtendedKeyUsage([
                ExtendedKeyUsageOID.SERVER_AUTH,
            ]),
            critical=True,
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName(domain)
            ]),
            critical=False,
        ).sign(ca_private_key, hashes.SHA256())
        
        # 개인키를 PEM 형식으로 변환
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        # ZIP 파일 생성
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # 새로운 서버 인증서
            new_cert_pem = new_cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
            zip_file.writestr(f'{domain}_server.crt', new_cert_pem)
            
            # 임시 생성된 서버 개인키
            zip_file.writestr(f'{domain}_server.key', private_key_pem)
            
            # CA 인증서
            zip_file.writestr('bssm_internal_ca.crt', ca.certificate)
            
            # nginx 설정 예시
            nginx_config = f"""# {domain} SSL 설정 예시
server {{
    listen 443 ssl;
    server_name {domain};
    
    ssl_certificate /path/to/{domain}_server.crt;
    ssl_certificate_key /path/to/{domain}_server.key;
    
    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 나머지 설정...
    location / {{
        root /var/www/html;
        index index.html index.htm;
    }}
}}

# HTTP에서 HTTPS로 리다이렉트
server {{
    listen 80;
    server_name {domain};
    return 301 https://$server_name$request_uri;
}}
"""
            zip_file.writestr('nginx_ssl_example.conf', nginx_config)
            
            # 설치 가이드
            install_guide = f"""# {domain} SSL 인증서 설치 가이드

## ⚠️ 중요 안내
이 패키지는 매번 다운로드할 때마다 새로운 개인키가 생성됩니다.
이전에 다운로드한 개인키와는 다른 키이므로, 기존 설정을 업데이트해야 합니다.

## 1. CA 인증서 설치 (브라우저 신뢰용)
- bssm_internal_ca.crt 파일을 더블클릭하여 브라우저에 설치
- "신뢰할 수 있는 루트 인증 기관"으로 설치

## 2. nginx 설정
- {domain}_server.crt: 서버 인증서 (새로 생성됨)
- {domain}_server.key: 서버 개인키 (새로 생성됨)
- nginx_ssl_example.conf: 설정 예시 파일

## 3. nginx 설정 적용
1. 인증서 파일들을 안전한 위치에 복사
2. nginx 설정 파일에 SSL 설정 추가
3. nginx 재시작: sudo systemctl restart nginx

## 4. 확인
- https://{domain} 접속 테스트
- 브라우저에서 보안 경고 없이 접속되는지 확인

## 주의사항
- 개인키 파일({domain}_server.key)은 절대 공개하지 마세요
- 파일 권한을 적절히 설정하세요 (개인키: 600)
- 이 패키지를 다시 다운로드하면 새로운 키가 생성됩니다
"""
            zip_file.writestr('INSTALL_GUIDE.txt', install_guide)
        
        # 개인키는 메모리에서 즉시 삭제 (Python 가비지 컬렉션)
        del private_key
        del private_key_pem
        
        return zip_buffer.getvalue()
        
    except Exception as e:
        logger.error(f"SSL 패키지 생성 실패 ({domain}): {e}")
        raise 