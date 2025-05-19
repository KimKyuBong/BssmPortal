# BSSM Captive Portal

부산소프트웨어마이스터고등학교의 네트워크 관리 시스템입니다.

## 프로젝트 구조

```
├── front/           # 프론트엔드 (Next.js)
├── back/            # 백엔드 (Django)
│   ├── config/     # Django 프로젝트 설정
│   ├── users/      # 사용자 관리
│   ├── devices/    # 장치 관리
│   ├── rentals/    # 대여 시스템
│   ├── system/     # 시스템 관리
│   └── announcements/ # 공지사항
├── dns/            # DNS 서버 설정
├── db/             # 데이터베이스 관련 파일
├── kea/            # KEA DHCP 서버 설정
├── nginx/          # Nginx 설정
├── tftp/           # TFTP 서버 설정
├── smb/            # Samba 서버 설정
└── public/         # 공용 리소스
```

## 주요 기능

### 1. 네트워크 장치 관리
- MAC 주소 기반 장치 등록 및 관리
- 장치별 IP 주소 할당 및 추적
- 장치 활성화/비활성화 기능
- 장치 사용 이력 관리 및 모니터링
- 사용자별 장치 관리 권한 설정

### 2. 장비 대여 시스템
- 다양한 장비 유형 관리 (노트북, 태블릿, 데스크톱, 모니터 등)
- 장비 상태 추적 (사용 가능, 대여 중, 점검 중, 고장, 분실, 폐기)
- MAC 주소 기반 장비 식별 (이더넷, 와이파이 인터페이스 구분)
- 대여/반납 프로세스 자동화
  - 대여 신청 및 승인 시스템
  - 반납 기한 관리
  - 연체 상태 추적
- 장비 이력 관리
  - 대여/반납 기록
  - 손상/분실 보고
  - 유지보수 기록

### 3. 사용자 인증 시스템
- JWT 기반 사용자 인증
- 역할 기반 접근 제어 (RBAC)
  - 일반 사용자
  - 관리자
- 토큰 갱신 메커니즘
- 보안 정책 관리

### 4. DHCP 서버 관리
- KEA DHCP 서버 설정 관리
- IP 주소 풀 관리
- DHCP 리스 모니터링
- 네트워크 세그먼트 관리

### 5. DNS 서버 관리
- DNS 레코드 관리
- 도메인 설정
- DNS 쿼리 로깅
- 캐시 관리

### 6. 모니터링 및 로깅
- 장치 접속 로그
- 대여 현황 모니터링
- 시스템 상태 모니터링
- 이벤트 로깅 및 알림

## 기술 스택

### 프론트엔드
- Next.js
- TypeScript
- Tailwind CSS

### 백엔드
- Django 5.1.6
- Django REST Framework 3.15.2
- JWT 인증 (djangorestframework_simplejwt)
- MySQL (mysql-connector-python)
- Gunicorn WSGI 서버

### 인프라
- Jenkins (CI/CD)
- Docker
- Nginx
- KEA DHCP Server
- DNS Server
- TFTP Server
- Samba Server

## 개발 환경 설정

1. 의존성 설치
```bash
# 프론트엔드
cd front/bssminfo
yarn install

# 백엔드
cd back
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. 개발 서버 실행
```bash
# 프론트엔드
cd front/bssminfo
yarn dev

# 백엔드
cd back
python manage.py runserver
```

## API 엔드포인트

### 인증
- POST `/api/auth/login/` - 로그인
- POST `/api/auth/refresh/` - 토큰 갱신

### 사용자 관리
- `/api/users/` - 사용자 CRUD
- `/api/admin/users/` - 관리자용 사용자 관리

### 장치 관리
- `/api/devices/` - 장치 CRUD
- `/api/admin/devices/history/` - 장치 이력 관리

### 대여 시스템
- `/api/rentals/` - 일반 사용자용 대여 관리
- `/api/admin/rentals/` - 관리자용 대여 관리
- `/api/admin/rental-requests/` - 대여 요청 관리

## 배포

프로젝트는 Jenkins를 통해 자동으로 빌드 및 배포됩니다.

### Jenkins 파이프라인 단계
1. Checkout: 소스 코드 체크아웃
2. Dependencies 설치: yarn install
3. 빌드: yarn build
4. 아티팩트 아카이브

## 환경 변수

프로젝트 실행에 필요한 환경 변수는 각 서비스의 .env 파일에서 관리됩니다.

### 백엔드 환경 변수
- `DATABASE_URL`: 데이터베이스 연결 문자열
- `SECRET_KEY`: Django 보안 키
- `DEBUG`: 디버그 모드 설정
- `ALLOWED_HOSTS`: 허용된 호스트 목록

## 라이선스

이 프로젝트는 부산소프트웨어마이스터고등학교의 소유입니다.

## 설치 및 설정 가이드

### 사전 요구사항

- Docker Engine 24.0.0 이상
- Docker Compose v2.0.0 이상
- Git

### 시스템 요구사항

- CPU: 2코어 이상
- RAM: 4GB 이상
- 저장공간: 20GB 이상
- 네트워크: 1Gbps 이상의 네트워크 인터페이스 2개 이상

### 설치 및 실행

1. 저장소 클론
```bash
git clone https://github.com/your-repo/BssmCaptive.git
cd BssmCaptive
```

2. 환경 변수 설정
```bash
# .env 파일 생성
cp .env.example .env
```

필수 환경 변수 설정:
```env
# Django 설정
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=*

# 데이터베이스 설정
KEA_DATABASE_USER=kea
KEA_DATABASE_PASSWORD=your-password
KEA_DATABASE_NAME=kea
KEA_DATABASE_PORT=3306
MYSQL_ROOT_PASSWORD=your-root-password

# JWT 설정
JWT_ACCESS_TOKEN_HOURS=1
JWT_REFRESH_TOKEN_DAYS=7
JWT_ALGORITHM=HS256

# CORS 설정
CORS_ALLOWED_ORIGINS=http://localhost:3000

# KEA DHCP 네트워크 설정
KEA_INTERFACE=eth0
KEA_INTERFACE2=eth1

# Samba 설정
SAMBA_USER=your-username
SAMBA_PASSWORD=your-password
```

3. Docker 컨테이너 실행
```bash
# 모든 서비스 실행
docker-compose up -d

# 특정 서비스만 실행
docker-compose up -d [서비스명]
# 예: docker-compose up -d back nginx db
```

4. 데이터베이스 초기화
```bash
# 데이터베이스 마이그레이션
docker-compose exec back python manage.py migrate

# 초기 관리자 계정 생성
docker-compose exec back python manage.py createsuperuser
```

### 서비스 접속

- 웹 포털: `http://10.250.0.1`(미인증), `http://서버에 할당된 아이피`(인증)
  - 로그인 페이지에서 관리자 계정으로 접속
  - 초기 로그인 시 비밀번호 변경 필요

### 서비스 관리

1. **서비스 상태 확인**
```bash
# 전체 서비스 상태
docker-compose ps

# 특정 서비스 로그 확인
docker-compose logs -f [서비스명]
# 예: docker-compose logs -f back
```

2. **서비스 제어**
```bash
# 전체 서비스 중지
docker-compose stop

# 전체 서비스 재시작
docker-compose restart

# 특정 서비스 재시작
docker-compose restart [서비스명]

# 전체 서비스 중지, 컨테이너 제거
docker-compose down

# 전체 서비스 중지, 컨테이너 및 볼륨 제거
docker-compose down -v
```

3. **로그 확인**
```bash
# 실시간 로그 확인
docker-compose logs -f

# 특정 서비스 로그 확인
docker-compose logs -f [서비스명]

# 로그 파일 위치
- DHCP 로그: ./kea/logs/
- Django 로그: ./back/django.log
- Nginx 로그: ./nginx/logs/
```

4. **데이터 백업**
```bash
# 데이터베이스 백업
docker-compose exec db mysqldump -u root -p${MYSQL_ROOT_PASSWORD} ${KEA_DATABASE_NAME} > backup.sql

# 설정 파일 백업
tar -czf config-backup.tar.gz .env kea/config dns/unbound.conf
```

### 문제 해결

1. **컨테이너 상태 확인**
```bash
# 컨테이너 상태 및 로그 확인
docker-compose ps
docker-compose logs -f [문제가 있는 서비스명]
```

2. **네트워크 문제**
- DHCP 서버 문제
```bash
# DHCP 서버 로그 확인
docker-compose logs -f kea
# 설정 확인
cat kea/config/kea-dhcp4.conf
```

- DNS 서버 문제
```bash
# DNS 서버 로그 확인
docker-compose logs -f dns
# 설정 확인
cat dns/unbound.conf
```

3. **데이터베이스 문제**
```bash
# 데이터베이스 접속
docker-compose exec db mysql -u root -p

# 데이터베이스 상태 확인
docker-compose exec db mysqladmin -u root -p status
```

4. **웹 서버 문제**
```bash
# Nginx 설정 확인
cat nginx/nginx.conf

# Nginx 로그 확인
docker-compose logs -f nginx
```

### 업데이트

1. **코드 업데이트**
```bash
# 최신 코드 가져오기
git pull

# 컨테이너 재빌드 및 재시작
docker-compose down
docker-compose build
docker-compose up -d

# 데이터베이스 마이그레이션
docker-compose exec back python manage.py migrate
```

## UserScript 폴더
`userscript` 폴더에는 Windows 환경에서 사용할 수 있는 스크립트 파일들이 포함되어 있습니다:

- `start.bat`: Windows 배치 파일로, PowerShell 실행 정책을 변경하고 `shell.ps1` 스크립트를 실행합니다.
- `shell.ps1`: PowerShell 스크립트로, 다음 기능들을 수행합니다:
  - 시스템 정보 수집 (제조사, 모델, 시리얼번호, OS 정보 등)
  - 네트워크 어댑터 정보 수집 (MAC 주소, 인터페이스 타입)
  - 장비 등록 API 호출
  - 컴퓨터 이름 자동 변경 (사용자명-모델명 형식)
  - 관리자 권한 확인 및 요청

이 스크립트들은 Windows 클라이언트에서 장비 등록 및 네트워크 설정을 자동으로 구성하는데 사용됩니다. 실행 시 관리자 권한이 필요하며, 실행 후 컴퓨터 재시작이 필요할 수 있습니다. 