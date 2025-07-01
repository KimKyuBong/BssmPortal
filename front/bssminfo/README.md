# 부산소프트웨어마이스터고 정보 포털 (프론트엔드)

부산소프트웨어마이스터고 학생과 교사를 위한 정보 포털 시스템의 프론트엔드 코드입니다.

## 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **상태 관리**: React Context API
- **API 통신**: Fetch API
- **아이콘**: Lucide React

## 시작하기

### 필수 조건

- Node.js 18.17.0 이상
- npm 또는 yarn

### 설치 및 실행

1. 저장소 클론

```bash
git clone <repository-url>
cd front/bssminfo
```

2. 의존성 설치

```bash
npm install
# 또는
yarn install
```

3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가합니다:

```
# API 서버 URL (백엔드 기본 주소만 설정, /api는 자동으로 추가됨)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 백엔드 주소 변경 방법

프론트엔드에서 백엔드 주소를 변경하는 방법은 여러 가지가 있습니다:

#### 1. 환경 변수 파일 사용 (권장)

`.env.local` 파일에서 `NEXT_PUBLIC_API_BASE_URL` 값을 변경:

```bash
# 로컬 개발용
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# 서버용
NEXT_PUBLIC_API_BASE_URL=http://10.1.0.13:8000

# 다른 서버용
NEXT_PUBLIC_API_BASE_URL=http://your-server-ip:8000
```

#### 2. package.json 스크립트 사용

미리 정의된 스크립트를 사용하여 백엔드 주소를 변경:

```bash
# 로컬 백엔드 (localhost:8000)
yarn dev:local

# 서버 백엔드 (10.1.0.13:8000)
yarn dev:server

# 기본 설정 (환경 변수 파일 사용)
yarn dev
```

#### 3. 커맨드 라인에서 직접 설정

```bash
# 로컬 백엔드
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 yarn dev

# 서버 백엔드
NEXT_PUBLIC_API_BASE_URL=http://10.1.0.13:8000 yarn dev

# 다른 주소
NEXT_PUBLIC_API_BASE_URL=http://your-custom-address:8000 yarn dev
```

#### 4. 배포 환경에서

배포 시에는 Nginx 프록시 설정을 사용하므로 `/api` 경로를 사용합니다:

```bash
# 배포용 (Nginx 프록시 사용)
NEXT_PUBLIC_API_BASE_URL=/api yarn build
```

4. 개발 서버 실행

```bash
npm run dev
# 또는
yarn dev
```

5. 브라우저에서 `http://localhost:3000` 접속

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API 라우트 핸들러
│   ├── dashboard/          # 대시보드 페이지
│   │   ├── student/        # 학생 대시보드
│   │   └── teacher/        # 교사 대시보드
│   ├── login/              # 로그인 페이지
│   │   ├── student/        # 학생 로그인
│   │   └── teacher/        # 교사 로그인
│   └── page.tsx            # 메인 페이지
├── services/               # API 서비스
│   ├── api.ts              # API 클라이언트
│   ├── auth.ts             # 인증 서비스
│   ├── device.ts           # 장치 서비스
│   └── admin.ts            # 관리자 서비스
└── ...
```

## 백엔드 연동

이 프론트엔드는 Django 백엔드 API와 통신합니다. 백엔드 서버는 기본적으로 `http://localhost:8000`에서 실행되어야 합니다. 다른 URL을 사용하는 경우 `.env.local` 파일에서 `NEXT_PUBLIC_API_BASE_URL` 값을 변경하세요.

### API 엔드포인트

주요 API 엔드포인트:

- **인증**
  - 로그인: `/api/auth/login/`
  - 토큰 갱신: `/api/auth/token/refresh/`
  - 토큰 검증: `/api/auth/token/verify/`

- **사용자**
  - 사용자 목록: `/api/users/`
  - 현재 사용자: `/api/users/me/`

- **장치**
  - 장치 목록: `/api/devices/`
  - 장치 상세: `/api/devices/{id}/`
  - 장치 이력: `/api/devices/history/`

## 배포

프로덕션 빌드를 생성하려면:

```bash
npm run build
# 또는
yarn build
```

빌드된 애플리케이션을 실행하려면:

```bash
npm run start
# 또는
yarn start
```

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.
