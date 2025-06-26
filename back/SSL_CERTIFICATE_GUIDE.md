# BSSM DNS SSL 인증서 발급 가이드

## 개요
BSSM DNS 서비스에 내부 네트워크용 HTTPS 인증서 자동 발급 기능이 추가되었습니다. 이 기능을 통해 내부 도메인에 대해 신뢰할 수 있는 SSL/TLS 인증서를 자동으로 발급받을 수 있습니다.

## 주요 기능

### 1. 내부 CA (Certificate Authority) 자동 생성
- 최초 실행 시 BSSM 내부 CA가 자동으로 생성됩니다
- CA 인증서는 10년간 유효합니다
- 모든 도메인 인증서는 이 CA로 서명됩니다

### 2. 도메인별 SSL 인증서 발급
- DNS 레코드 등록 시 SSL 인증서 발급을 요청할 수 있습니다
- 인증서는 1년간 유효합니다
- Subject Alternative Names (SAN)을 통해 여러 도메인 지원
- IP 주소도 SAN에 포함됩니다

### 3. 자동 갱신 지원
- 만료 30일 전 자동 갱신 가능
- Django 관리 명령어를 통한 배치 갱신
- 크론잡으로 자동화 가능

## 사용 방법

### 1. DNS 요청 시 SSL 인증서 함께 신청

```json
POST /api/dns/requests/
{
    "domain": "myapp.bssm.local",
    "ip": "192.168.1.100",
    "reason": "내부 웹 애플리케이션용",
    "ssl_enabled": true
}
```

### 2. 기존 DNS 레코드에 SSL 추가

```json
PATCH /api/dns/records/{id}/update/
{
    "ssl_enabled": true
}
```

### 3. SSL 인증서 목록 조회

```bash
GET /api/dns/ssl/certificates/
```

### 4. 만료 예정 인증서 확인

```bash
GET /api/dns/ssl/certificates/expiring/?days=30
```

### 5. 인증서 수동 갱신

```bash
POST /api/dns/ssl/certificates/{id}/renew/
```

### 6. CA 인증서 다운로드

```bash
GET /api/dns/ssl/ca/download/
```

## 클라이언트 설정

### 1. CA 인증서 설치 (필수)
내부 CA로 발급된 인증서를 신뢰하려면 클라이언트에 CA 인증서를 설치해야 합니다.

#### Windows
1. CA 인증서 다운로드: `/api/dns/ssl/ca/download/`
2. 인증서 파일을 더블클릭하여 설치
3. "신뢰할 수 있는 루트 인증 기관" 저장소에 설치

#### macOS
```bash
# CA 인증서 다운로드
curl -o bssm_ca.crt http://dns.bssm.local/api/dns/ssl/ca/download/

# 키체인에 추가
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain bssm_ca.crt
```

#### Linux (Ubuntu/Debian)
```bash
# CA 인증서 다운로드
curl -o bssm_ca.crt http://dns.bssm.local/api/dns/ssl/ca/download/

# 시스템 CA 저장소에 추가
sudo cp bssm_ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

### 2. 웹 서버 설정 예시

#### Nginx
```nginx
server {
    listen 443 ssl;
    server_name myapp.bssm.local;
    
    ssl_certificate /etc/ssl/certs/myapp.bssm.local.crt;
    ssl_certificate_key /etc/ssl/private/myapp.bssm.local.key;
    
    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    location / {
        # 애플리케이션 설정
    }
}
```

#### Apache
```apache
<VirtualHost *:443>
    ServerName myapp.bssm.local
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/myapp.bssm.local.crt
    SSLCertificateKeyFile /etc/ssl/private/myapp.bssm.local.key
    SSLCertificateChainFile /etc/ssl/certs/myapp.bssm.local_chain.crt
    
    # 애플리케이션 설정
</VirtualHost>
```

## 자동 갱신 설정

### 1. 관리 명령어 실행
```bash
# 가상환경 활성화
source venv/bin/activate

# 만료 30일 전 인증서 갱신
python manage.py renew_ssl_certificates

# 만료 7일 전 인증서 갱신
python manage.py renew_ssl_certificates --days 7

# 실제 갱신하지 않고 대상만 확인
python manage.py renew_ssl_certificates --dry-run
```

### 2. 크론잡 설정
```bash
# crontab -e
# 매일 새벽 2시에 만료 30일 전 인증서 자동 갱신
0 2 * * * /home/bssm/BssmCaptive/back/venv/bin/python /home/bssm/BssmCaptive/back/manage.py renew_ssl_certificates
```

## 파일 위치

### 기본 경로
- CA 인증서: `/etc/ssl/ca/`
- 도메인 인증서: `/etc/ssl/certs/`
- 개인키: `/etc/ssl/private/`

### 환경변수로 경로 변경 가능
```bash
export SSL_CA_DIR="/custom/ca/path"
export SSL_CERT_DIR="/custom/cert/path"
export SSL_KEY_DIR="/custom/key/path"
```

## 보안 고려사항

### 1. 개인키 보호
- 개인키 파일은 600 권한으로 설정됩니다
- 웹 서버 사용자만 읽을 수 있도록 권한 설정 필요

### 2. CA 개인키 보안
- CA 개인키는 데이터베이스에 암호화되지 않은 상태로 저장됩니다
- 데이터베이스 접근 권한을 엄격히 관리해야 합니다
- 정기적인 CA 키 교체를 권장합니다

### 3. 인증서 유효성 검증
- 발급된 인증서는 내부 네트워크에서만 유효합니다
- 외부 공개 인터넷에서는 신뢰되지 않습니다

## 문제 해결

### 1. 인증서 발급 실패
```bash
# 로그 확인
tail -f django.log | grep ssl

# 디렉토리 권한 확인
ls -la /etc/ssl/
```

### 2. 브라우저에서 인증서 오류
- CA 인증서가 올바르게 설치되었는지 확인
- 브라우저 캐시 및 쿠키 삭제
- 인증서 체인 파일 사용 여부 확인

### 3. 자동 갱신 실패
```bash
# 수동 갱신 테스트
python manage.py renew_ssl_certificates --dry-run

# 특정 인증서 상태 확인
python manage.py shell
>>> from dns.models import SslCertificate
>>> cert = SslCertificate.objects.get(domain='example.bssm.local')
>>> print(cert.status, cert.expires_at)
```

## API 엔드포인트 요약

| 메소드 | 엔드포인트 | 설명 |
|--------|------------|------|
| GET | `/api/dns/ssl/certificates/` | SSL 인증서 목록 조회 |
| GET | `/api/dns/ssl/certificates/{id}/` | SSL 인증서 상세 조회 |
| POST | `/api/dns/ssl/certificates/{id}/renew/` | SSL 인증서 갱신 |
| POST | `/api/dns/ssl/certificates/{id}/revoke/` | SSL 인증서 취소 |
| GET | `/api/dns/ssl/certificates/expiring/` | 만료 예정 인증서 조회 |
| GET | `/api/dns/ssl/ca/` | CA 정보 조회 |
| GET | `/api/dns/ssl/ca/download/` | CA 인증서 다운로드 |

---

이 기능을 통해 내부 네트워크에서 안전한 HTTPS 통신을 쉽게 구현할 수 있습니다. 추가 질문이나 문제가 있으면 시스템 관리자에게 문의하세요. 