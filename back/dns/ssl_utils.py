import os
import datetime
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.conf import settings
from django.utils import timezone
from .models import CertificateAuthority, SslCertificate, CustomDnsRecord
import logging

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
    
    def create_ca(self, ca_name="BSSM Internal CA", validity_days=3650):
        """내부 CA 생성"""
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
                x509.NameAttribute(NameOID.LOCALITY_NAME, "Busanjin-gu"),
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
                x509.BasicConstraints(ca=True, path_length=None),
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
            
            logger.info(f"CA 생성 완료: {ca_name}")
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
    
    def generate_certificate(self, domain, dns_record, validity_days=365):
        """도메인용 SSL 인증서 생성"""
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
            
            # SAN (Subject Alternative Names) 설정
            san_list = [x509.DNSName(domain)]
            
            # www 서브도메인 추가
            if not domain.startswith('www.'):
                san_list.append(x509.DNSName(f'www.{domain}'))
            
            # IP 주소도 SAN에 추가
            try:
                import ipaddress
                ip_obj = ipaddress.ip_address(dns_record.ip)
                san_list.append(x509.IPAddress(ip_obj))
            except ValueError:
                pass
            
            server_cert = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                ca_cert.subject
            ).public_key(
                server_private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
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
            ).sign(ca_private_key, hashes.SHA256())
            
            # PEM 형식으로 변환
            server_cert_pem = server_cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')
            server_key_pem = server_private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            # 만료일 계산
            expires_at = timezone.now() + datetime.timedelta(days=validity_days)
            
            # 데이터베이스에 저장
            ssl_cert, created = SslCertificate.objects.update_or_create(
                dns_record=dns_record,
                defaults={
                    'domain': domain,
                    'certificate': server_cert_pem,
                    'private_key': server_key_pem,
                    'certificate_chain': ca.certificate,
                    'status': '활성',
                    'expires_at': expires_at
                }
            )
            
            # 파일로도 저장
            cert_path = os.path.join(self.cert_dir, f'{domain}.crt')
            key_path = os.path.join(self.key_dir, f'{domain}.key')
            chain_path = os.path.join(self.cert_dir, f'{domain}_chain.crt')
            
            with open(cert_path, 'w') as f:
                f.write(server_cert_pem)
            
            with open(key_path, 'w') as f:
                f.write(server_key_pem)
            
            with open(chain_path, 'w') as f:
                f.write(server_cert_pem + ca.certificate)
            
            os.chmod(key_path, 0o600)
            
            logger.info(f"SSL 인증서 생성 완료: {domain}")
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
            key_path = os.path.join(self.key_dir, f'{domain}.key')
            chain_path = os.path.join(self.cert_dir, f'{domain}_chain.crt')
            
            for path in [cert_path, key_path, chain_path]:
                if os.path.exists(path):
                    os.remove(path)
            
            # 데이터베이스에서 삭제
            ssl_cert.delete()
            
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
    
    def renew_certificate(self, ssl_cert, validity_days=365):
        """인증서 갱신"""
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