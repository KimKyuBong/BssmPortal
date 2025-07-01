# OCSP 서버 가이드

## 개요

이 문서는 BSSM 내부망용 OCSP(Online Certificate Status Protocol) 서버의 사용법과 설정 방법을 설명합니다.

## OCSP 서버란?

OCSP는 클라이언트가 인증서의 유효성을 실시간으로 확인할 수 있게 해주는 프로토콜입니다.

- **실시간 확인**: 인증서가 폐기되었는지 즉시 확인 가능
- **자동화**: 브라우저/OS가 자동으로 OCSP 서버에 질의
- **보안 강화**: 폐기된 인증서로의 접근 차단

## 구현된 기능

### 1. 인증서 상태 확인
- **GOOD**: 정상 인증서
- **REVOKED**: 폐기된 인증서
- **UNKNOWN**: 알 수 없는 인증서

### 2. 자동 폐기 처리
- 인증서 재발급 시 기존 인증서 자동 폐기
- 수동 폐기 기능 (관리자 페이지)
- 만료된 인증서 자동 폐기 처리

### 3. OCSP URL 자동 포함
- 새로 발급되는 모든 인증서에 OCSP URL 자동 포함
- 클라이언트가 자동으로 OCSP 서버에 질의

## 설정 방법

### 1. 환경변수 설정

```bash
# OCSP 서버 URL 설정 (내부망 주소로 변경)
export OCSP_URL="http://your-internal-server:8000/dns/ocsp/"

# SSL 인증서 관련 설정
export SSL_CA_DIR="/etc/ssl/ca"
export SSL_CERT_DIR="/etc/ssl/certs"
export SSL_KEY_DIR="/etc/ssl/private"
```

### 2. 데이터베이스 마이그레이션

```bash
cd back
source venv/bin/activate
python manage.py makemigrations dns
python manage.py migrate dns
```

### 3. 서버 재시작

```bash
# Django 서버 재시작
python manage.py runserver 0.0.0.0:8000

# 또는 Gunicorn 사용
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

## API 엔드포인트

### 1. OCSP 요청 처리
- **URL**: `/dns/ocsp/`
- **Method**: POST
- **Content-Type**: `application/ocsp-request`
- **응답**: `application/ocsp-response`

### 2. OCSP 서버 상태 확인
- **URL**: `/dns/ocsp/`
- **Method**: GET
- **응답**: JSON 형태의 서버 상태 정보

## 테스트 방법

### 1. 헬스체크

```bash
cd back
python test_ocsp.py health
```

### 2. 인증서로 OCSP 테스트

```bash
cd back
python test_ocsp.py test /path/to/certificate.crt
```

### 3. 브라우저에서 테스트

1. CA 인증서를 브라우저에 설치
2. OCSP URL이 포함된 인증서로 HTTPS 접속
3. 브라우저가 자동으로 OCSP 서버에 질의

## 클라이언트 설정

### 1. 브라우저 설정

대부분의 최신 브라우저는 인증서에 OCSP URL이 포함되어 있으면 자동으로 OCSP 서버에 질의합니다.

### 2. 운영체제 설정

#### Windows
- 인증서 관리자에서 CA 인증서 설치
- OCSP URL이 포함된 인증서 사용

#### macOS
- 키체인 접근에서 CA 인증서 신뢰
- OCSP URL이 포함된 인증서 사용

#### Linux
- CA 인증서를 시스템 신뢰 저장소에 설치
- OCSP URL이 포함된 인증서 사용

## 관리자 기능

### 1. 인증서 폐기

관리자 페이지에서 인증서를 수동으로 폐기할 수 있습니다:

1. Django 관리자 페이지 접속
2. DNS > SSL 인증서 목록에서 해당 인증서 선택
3. 상태를 '폐기'로 변경
4. 저장

### 2. 폐기된 인증서 확인

```python
from dns.models import SslCertificate

# 폐기된 인증서 목록 조회
revoked_certs = SslCertificate.objects.filter(status='폐기')
for cert in revoked_certs:
    print(f"도메인: {cert.domain}, 폐기일: {cert.revoked_at}")
```

## 로그 확인

OCSP 서버의 동작을 확인하려면 Django 로그를 확인하세요:

```bash
tail -f back/django.log | grep ocsp
```

## 보안 고려사항

### 1. 네트워크 보안
- OCSP 서버는 내부망에서만 접근 가능하도록 설정
- 방화벽으로 외부 접근 차단

### 2. 인증서 보안
- CA 개인키는 절대 외부에 노출하지 않음
- 인증서 파일 권한 설정 (600)

### 3. 로그 관리
- OCSP 요청/응답 로그 정기적 확인
- 보안 이벤트 모니터링

## 문제 해결

### 1. OCSP 서버 응답 없음
- Django 서버가 실행 중인지 확인
- 네트워크 연결 상태 확인
- 방화벽 설정 확인

### 2. 인증서 상태 확인 실패
- 데이터베이스 연결 상태 확인
- 인증서 시리얼 번호가 DB에 저장되어 있는지 확인

### 3. 브라우저에서 OCSP 오류
- CA 인증서가 올바르게 설치되었는지 확인
- OCSP URL이 올바른지 확인
- 네트워크 접근성 확인

## 성능 최적화

### 1. 캐싱
- OCSP 응답에 적절한 캐시 헤더 설정
- 클라이언트 캐싱 활용

### 2. 데이터베이스 최적화
- 인증서 시리얼 번호에 인덱스 생성
- 정기적인 데이터베이스 정리

### 3. 로드 밸런싱
- 대용량 환경에서는 OCSP 서버 분산 배포 고려

## 추가 개발

### 1. CRL 지원
현재는 OCSP만 지원하지만, 필요시 CRL(Certificate Revocation List) 기능도 추가 가능합니다.

### 2. 모니터링
OCSP 서버 상태 모니터링 및 알림 기능 추가 가능합니다.

### 3. API 확장
REST API를 통한 인증서 상태 조회 기능 추가 가능합니다. 