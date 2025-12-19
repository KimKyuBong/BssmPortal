# MCP 서버 접속 및 보안 가이드

## 🔐 인증 방식

### MCP 서버는 2단계 인증을 사용합니다:

1. **MCP 서버 시작 시 Django 로그인**
   - 사용자명과 비밀번호 입력
   - Django 백엔드에서 JWT 토큰 발급
   - 토큰은 메모리에 저장 (파일 저장 안함)

2. **모든 API 요청에 JWT 토큰 자동 첨부**
   - Authorization: Bearer {token}
   - 토큰 만료 5분 전 자동 갱신
   - 세션 유지 관리 자동화

## 📡 접속 방법

### 방법 1: 직접 실행 (테스트용)

```bash
cd /home/bssm/BssmCaptive/mcp-server
.venv/bin/python server.py
```

**실행 시 입력:**
```
=== BSSM Captive Portal MCP Server v2.0 ===
Django API: http://localhost:8000
총 도구: 42개

사용자명: admin          # Django 사용자명 입력
비밀번호: ********       # Django 비밀번호 입력

로그인 중...
✓ 로그인 성공: admin
✓ 권한: 관리자
```

이후 MCP 서버가 stdio 모드로 대기합니다.

### 방법 2: Claude Desktop 연동 (실제 사용)

#### Step 1: Claude Desktop 설정

**Linux:** `~/.config/Claude/claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bssm-captive": {
      "command": "/home/bssm/BssmCaptive/mcp-server/.venv/bin/python",
      "args": ["/home/bssm/BssmCaptive/mcp-server/server.py"],
      "env": {
        "DJANGO_API_URL": "http://localhost:8000"
      }
    }
  }
}
```

#### Step 2: 인증 정보 저장 (선택사항)

**방법 A: 환경 변수 사용 (권장)**

`.env` 파일 수정:
```env
# Django 사용자 인증 (선택사항)
MCP_USERNAME=admin
MCP_PASSWORD=your_password_here
```

`server.py` 수정:
```python
# 환경 변수에서 인증 정보 가져오기
username = os.getenv("MCP_USERNAME") or input("사용자명: ")
password = os.getenv("MCP_PASSWORD") or input("비밀번호: ")
```

**방법 B: 매번 입력 (보안 권장)**

인증 정보를 저장하지 않고 Claude Desktop 시작 시마다 터미널에서 입력

#### Step 3: Claude Desktop 재시작

설정 후 Claude Desktop을 재시작하면 MCP 서버가 자동으로 연결됩니다.

### 방법 3: Docker 실행

```bash
# docker-compose.yaml에 추가
services:
  mcp-server:
    build: ./mcp-server
    environment:
      - DJANGO_API_URL=http://back:8000
      - MCP_USERNAME=admin
      - MCP_PASSWORD=${MCP_PASSWORD}  # .env에서 로드
    stdin_open: true
    tty: true
```

```bash
# .env 파일
MCP_PASSWORD=your_secure_password
```

```bash
docker-compose up -d mcp-server
```

## 🔒 보안 모범 사례

### 1. **비밀번호 관리**

❌ **하지 말 것:**
```python
# 코드에 비밀번호 하드코딩
password = "admin123"  # 절대 금지!
```

✅ **권장 방법:**
```bash
# 환경 변수 사용
export MCP_PASSWORD="secure_password"
```

또는 `.env` 파일 사용 (Git에 커밋하지 말 것!)

### 2. **JWT 토큰 관리**

- ✅ 메모리에만 저장 (파일 저장 안함)
- ✅ 자동 갱신 (만료 5분 전)
- ✅ 로그에 토큰 출력 안함

### 3. **접근 제어**

```python
# auth_manager가 자동으로 권한 검증
if not auth_manager.is_admin:
    return {"success": False, "message": "관리자 권한이 필요합니다."}
```

### 4. **네트워크 보안**

- Django 백엔드: `localhost:8000` (로컬만)
- 프로덕션: HTTPS 필수
- 방화벽으로 Django API 포트 보호

## 🎯 실제 사용 예시

### 시나리오 1: Claude Desktop에서 사용

```
You: "내 장치 목록을 보여줘"

Claude: [MCP 도구 호출]
        get_my_devices() → Django API 호출 (JWT 토큰 포함)
        
결과: 
✓ 장치 3개 조회 완료
1. MyLaptop (AA:BB:CC:DD:EE:FF) - 활성
2. MyPhone (11:22:33:44:55:66) - 활성
3. MyTablet (AA:11:BB:22:CC:33) - 비활성
```

### 시나리오 2: 관리자 작업

```
관리자: "비활성 장치들의 IP를 재할당해줘"

Claude: [다중 MCP 도구 호출]
        1. admin_list_all_devices(is_active=False) → 비활성 장치 조회
        2. admin_reassign_device_ip(device_id=3) → IP 재할당
        
결과:
✓ 비활성 장치 1개 발견
✓ 장치 ID 3의 IP를 10.250.1.100 → 10.250.1.150으로 재할당 완료
```

## 🔧 문제 해결

### Q1: "인증되지 않았습니다" 오류

**원인:** JWT 토큰 만료 또는 잘못된 인증 정보

**해결:**
```bash
# 1. Django 사용자 확인
cd /home/bssm/BssmCaptive/back
.venv/bin/python manage.py createsuperuser

# 2. 올바른 사용자명/비밀번호로 재시작
```

### Q2: "Django 연결 실패"

**원인:** Django 백엔드가 실행 중이 아님

**해결:**
```bash
# Django 실행 확인
curl http://localhost:8000/api/

# 실행되지 않았다면
cd /home/bssm/BssmCaptive
docker-compose up -d back
```

### Q3: Claude Desktop에서 MCP 서버 연결 안됨

**원인:** 설정 파일 경로 또는 권한 문제

**해결:**
1. 설정 파일 경로 확인
2. Python 경로 절대 경로로 지정
3. Claude Desktop 재시작
4. 로그 확인: `~/.config/Claude/logs/`

## 📝 보안 체크리스트

- [ ] `.env` 파일을 `.gitignore`에 추가
- [ ] 프로덕션에서 HTTPS 사용
- [ ] 강력한 비밀번호 사용
- [ ] JWT 토큰 만료 시간 적절히 설정
- [ ] 관리자 권한 필요한 도구는 권한 검증
- [ ] 로그에 민감 정보 출력하지 않기
- [ ] 정기적으로 비밀번호 변경

## 🎉 정리

**보안 키는 별도로 필요 없습니다!**

MCP 서버는:
1. **Django 사용자명/비밀번호**로 로그인
2. **JWT 토큰**으로 API 인증
3. **stdio** 통신으로 Claude Desktop과 연결

별도의 API 키나 인증서는 필요하지 않습니다. Django 백엔드의 기존 인증 시스템을 그대로 사용합니다.
