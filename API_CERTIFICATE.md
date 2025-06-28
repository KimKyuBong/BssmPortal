# SSL 인증서 생성 API 문서

## 새로운 엔드포인트

### 1. 사용자 DNS 레코드 조회
**GET** `/api/dns/records/my/`

사용자가 소유한 DNS 레코드 목록을 조회합니다.

**권한**: 인증된 사용자
- 일반 사용자: 본인 소유 DNS 레코드만 조회
- 관리자: 모든 DNS 레코드 조회

**응답 예시**:
```json
[
    {
        "id": 1,
        "domain": "정보포털.한국",
        "ip": "10.129.55.253",
        "ssl_enabled": true,
        "created_at": "2024-12-26T13:00:00Z",
        "user_name": "홍길동",
        "ssl_certificate": {
            "id": 1,
            "domain": "xn--on3bn7rslhcxc.xn--3e0b707e",
            "status": "활성",
            "issued_at": "2024-12-26T13:00:00Z",
            "expires_at": "2124-12-26T13:00:00Z",
            "days_until_expiry": 36500,
            "is_expired": false
        }
    }
]
```

### 2. 인증서 파일 생성
**POST** `/api/dns/ssl/certificates/generate/`

DNS에 등록된 도메인명으로 SSL 인증서 파일을 생성하고 반환합니다.

**권한**: 인증된 사용자
- 일반 사용자: 본인 소유 도메인만 가능
- 관리자: 모든 도메인 가능

**요청 본문**:
```json
{
    "domain": "정보포털.한국"
}
```

**응답 예시**:
```json
{
    "domain": "정보포털.한국",
    "certificate": "-----BEGIN CERTIFICATE-----\nMIIE...\n-----END CERTIFICATE-----",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----",
    "certificate_chain": "",
    "ca_certificate": "-----BEGIN CERTIFICATE-----\nMIIE...\n-----END CERTIFICATE-----",
    "expires_at": "2124-12-26T13:00:00Z",
    "issued_at": "2024-12-26T13:00:00Z"
}
```

**오류 응답**:
- `400 Bad Request`: 잘못된 도메인 형식
- `403 Forbidden`: 도메인 소유권 없음
- `404 Not Found`: 등록되지 않은 도메인
- `500 Internal Server Error`: 인증서 생성 실패

### 3. CA 인증서 다운로드
**GET** `/api/dns/ssl/ca/download/`

BSSM Root CA 인증서 파일을 다운로드합니다.

**권한**: 인증된 사용자

**응답**: 
- **Content-Type**: `application/x-pem-file`
- **Content-Disposition**: `attachment; filename="bssm_root_ca.crt"`
- **Body**: CA 인증서 PEM 파일 내용

**사용법**:
- 브라우저에서 직접 접속하면 파일 다운로드
- API로 호출하면 CA 인증서 내용을 텍스트로 반환

**오류 응답**:
- `404 Not Found`: CA 인증서를 찾을 수 없음
- `500 Internal Server Error`: 다운로드 실패

## 도메인 소유권 확인 규칙

### 일반 사용자
1. DNS 레코드의 `user` 필드가 본인인 경우
2. DNS 레코드의 IP가 본인 소유 장비의 IP인 경우

### 관리자
- 모든 도메인에 대해 인증서 발급 가능

## 사용 예시

### 1. 내 DNS 레코드 조회
```bash
curl -X GET "http://10.129.55.253:8080/api/dns/records/my/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 인증서 생성
```bash
curl -X POST "http://10.129.55.253:8080/api/dns/ssl/certificates/generate/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "정보포털.한국"}'
```

### 3. CA 인증서 다운로드
```bash
# 파일로 다운로드
curl -X GET "http://10.129.55.253:8080/api/dns/ssl/ca/download/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o bssm_root_ca.crt

# 내용 확인
curl -X GET "http://10.129.55.253:8080/api/dns/ssl/ca/download/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 인증서 파일 저장
Python 예시:
```python
import requests
import json

# API 호출
response = requests.post(
    'http://10.129.55.253:8080/api/dns/ssl/certificates/generate/',
    headers={'Authorization': 'Bearer YOUR_TOKEN'},
    json={'domain': '정보포털.한국'}
)

if response.status_code == 200:
    data = response.json()
    
    # 인증서 파일 저장
    with open('certificate.crt', 'w') as f:
        f.write(data['certificate'])
    
    # 개인키 파일 저장
    with open('private.key', 'w') as f:
        f.write(data['private_key'])
    
    # CA 인증서 파일 저장
    with open('ca.crt', 'w') as f:
        f.write(data['ca_certificate'])
    
    print("인증서 파일이 생성되었습니다!")
else:
    print(f"오류: {response.json()}")

# CA 인증서 별도 다운로드
ca_response = requests.get(
    'http://10.129.55.253:8080/api/dns/ssl/ca/download/',
    headers={'Authorization': 'Bearer YOUR_TOKEN'}
)

if ca_response.status_code == 200:
    with open('bssm_root_ca.crt', 'w') as f:
        f.write(ca_response.text)
    print("CA 인증서 파일이 다운로드되었습니다!")
```

### 5. 브라우저에서 CA 인증서 설치
1. 브라우저에서 `http://10.129.55.253:8080/api/dns/ssl/ca/download/` 접속
2. `bssm_root_ca.crt` 파일 다운로드
3. 브라우저 설정에서 인증서 가져오기
4. "신뢰할 수 있는 루트 인증 기관"으로 설치

## 주요 특징

1. **도메인 소유권 검증**: 사용자가 해당 도메인에 대한 권한이 있는지 확인
2. **한글 도메인 지원**: 한글 도메인을 자동으로 punycode로 변환
3. **기존 인증서 재사용**: 유효한 인증서가 있으면 재사용
4. **관리자 권한**: 관리자는 모든 도메인에 대해 인증서 발급 가능
5. **완전한 인증서 체인**: 인증서, 개인키, CA 인증서를 모두 제공
6. **100년 유효기간**: 실질적으로 무기한 사용 가능한 인증서
7. **CA 인증서 다운로드**: 브라우저 설치용 CA 인증서 파일 제공

## 인증서 설치 가이드

### Windows
1. CA 인증서 파일 다운로드
2. 파일을 더블클릭하여 인증서 설치 마법사 실행
3. "로컬 컴퓨터"에 설치 선택
4. "신뢰할 수 있는 루트 인증 기관" 저장소에 배치

### macOS
1. CA 인증서 파일 다운로드
2. 키체인 접근 앱 실행
3. 인증서 파일을 "시스템" 키체인으로 드래그
4. 인증서를 더블클릭하고 "항상 신뢰" 설정

### Linux
1. CA 인증서 파일을 `/usr/local/share/ca-certificates/`에 복사
2. `sudo update-ca-certificates` 실행 