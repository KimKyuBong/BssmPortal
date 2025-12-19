# MCP 서버 HTTP 모드 + API 키 보안 가이드

## 🎉 변경 사항

### ✅ HTTP가 이제 기본입니다!

- **stdio 모드**: `server_stdio.py` (백업)
- **HTTP 모드**: `server.py` ⭐ **기본**

### 🔐 API 키 보안 추가

원격 접속 보안을 위해 API 키 인증이 추가되었습니다.

## 🚀 빠른 시작

### 1. API 키 생성

```bash
cd /home/bssm/BssmCaptive/mcp-server
.venv/bin/python generate_api_key.py
```

**출력 예시:**
```
============================================================
BSSM MCP Server - API Key Generator
============================================================

✓ 새로운 API 키가 생성되었습니다:

API Key: AbCdEf123456...XyZ (64자)

⚠️  이 키를 안전한 곳에 보관하세요!

============================================================
.env 파일에 다음 내용을 추가하세요:
============================================================

MCP_API_KEY=AbCdEf123456...XyZ
```

### 2. .env 파일 설정

```bash
# .env 파일 편집
nano .env

# 또는 자동 추가
echo "MCP_API_KEY=생성된_키를_여기에" >> .env
```

### 3. 서버 실행

```bash
.venv/bin/python server.py

# 또는
./run.sh
```

**실행 결과:**
```
=== BSSM Captive Portal MCP Server (HTTP/SSE) ===
Django API: http://localhost:8000
총 도구: 42개

사용자명: admin
비밀번호: ********

✓ 로그인 성공: admin
✓ 권한: 관리자

HTTP/SSE 서버를 시작합니다...
URL: http://0.0.0.0:3000
Health Check: http://0.0.0.0:3000/health
```

## 🔌 클라이언트 접속

### 방법 1: HTTP 헤더 (권장)

```bash
# 헬스체크 (API 키 불필요)
curl http://서버IP:3000/health

# SSE 연결 (API 키 필요)
curl -H "X-API-Key: 생성된_API_키" \
     http://서버IP:3000/sse
```

### 방법 2: 쿼리 파라미터

```bash
curl "http://서버IP:3000/sse?api_key=생성된_API_키"
```

### Claude Desktop 설정

```json
{
  "mcpServers": {
    "bssm-captive": {
      "type": "sse",
      "url": "http://서버IP:3000/sse",
      "headers": {
        "X-API-Key": "생성된_API_키"
      }
    }
  }
}
```

### Python 클라이언트

```python
import httpx

api_key = "생성된_API_키"
headers = {"X-API-Key": api_key}

async with httpx.AsyncClient(headers=headers) as client:
    async with client.stream("GET", "http://서버IP:3000/sse") as response:
        async for line in response.aiter_lines():
            print(line)
```

## 🔒 보안 설정

### API 키 없이 실행 (개발 모드)

`.env`에서 `MCP_API_KEY`를 설정하지 않으면 API 키 검증을 건너뜁니다.

```bash
# .env에서 MCP_API_KEY 주석 처리 또는 삭제
# MCP_API_KEY=...
```

⚠️ **프로덕션에서는 반드시 API 키를 설정하세요!**

### API 키 관리

```bash
# 새 키 생성
.venv/bin/python generate_api_key.py

# 기존 키 확인 (해시만 저장됨)
cat .api_keys.json

# 키 변경
# 1. 새 키 생성
# 2. .env 파일 업데이트
# 3. 서버 재시작
```

### 여러 API 키 사용 (다중 클라이언트)

현재는 단일 API 키만 지원합니다. 여러 클라이언트가 같은 키를 공유합니다.

향후 업데이트에서 다중 키 지원 예정입니다.

## 🌐 원격 접속 설정

### 1. 방화벽 열기

```bash
# 3000 포트 열기
sudo ufw allow 3000/tcp

# 특정 IP만 허용 (권장)
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

### 2. Nginx 리버스 프록시 (HTTPS)

```nginx
server {
    listen 443 ssl;
    server_name mcp.bssm.hs.kr;

    ssl_certificate /etc/letsencrypt/live/mcp.bssm.hs.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.bssm.hs.kr/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. Docker 설정

```yaml
# docker-compose.yaml
services:
  mcp-server:
    build: ./mcp-server
    ports:
      - "3000:3000"
    environment:
      - DJANGO_API_URL=http://back:8000
      - MCP_API_KEY=${MCP_API_KEY}
    command: [".venv/bin/python", "server.py"]
```

```bash
# .env 파일
MCP_API_KEY=생성된_키

# 실행
docker-compose up -d mcp-server
```

## 📊 접속 테스트

### 1. 헬스체크 (API 키 불필요)

```bash
curl http://localhost:3000/health
```

**정상 응답:**
```json
{
  "status": "healthy",
  "server": "bssm-captive-mcp",
  "version": "2.0.0",
  "authenticated": true,
  "user": "admin",
  "is_admin": true,
  "tools": 42
}
```

### 2. API 키 없이 SSE 접속 (실패)

```bash
curl http://localhost:3000/sse
```

**오류 응답:**
```json
{
  "error": "Unauthorized",
  "message": "유효하지 않은 API 키입니다."
}
```

### 3. API 키로 SSE 접속 (성공)

```bash
curl -H "X-API-Key: 생성된_키" http://localhost:3000/sse
```

**성공 시 SSE 스트림이 시작됩니다.**

## 🔧 문제 해결

### Q: API 키가 작동하지 않습니다

**확인사항:**
1. .env 파일에 MCP_API_KEY 설정되었는지
2. 서버 재시작했는지
3. 정확한 키를 사용하는지
4. 헤더 이름이 정확한지 (`X-API-Key`)

```bash
# .env 확인
cat .env | grep MCP_API_KEY

# 서버 재시작
# Ctrl+C로 종료 후
.venv/bin/python server.py
```

### Q: 원격에서 접속이 안됩니다

**확인사항:**
1. 방화벽 설정
2. 서버가 0.0.0.0으로 바인딩되었는지
3. 네트워크 연결 상태

```bash
# 포트 리스닝 확인
netstat -tuln | grep 3000

# 방화벽 상태
sudo ufw status
```

### Q: CORS 오류

CORS는 이미 설정되어 있습니다 (`allow_origins=["*"]`).

특정 도메인만 허용하려면:

```python
# server.py에서
Middleware(CORSMiddleware, 
    allow_origins=["https://yourdomain.com"],  
    allow_methods=["*"], 
    allow_headers=["*"]
)
```

## 📝 체크리스트

설정 완료 체크리스트:

- [ ] API 키 생성 (`generate_api_key.py`)
- [ ] .env에 MCP_API_KEY 추가
- [ ] 서버 실행 확인 (`server.py`)
- [ ] 헬스체크 테스트
- [ ] API 키로 SSE 접속 테스트
- [ ] 방화벽 설정 (원격 접속 시)
- [ ] Nginx/HTTPS 설정 (프로덕션)
- [ ] 클라이언트 연동 테스트

## 🎯 정리

### 변경된 파일

- `server.py` ⭐ HTTP/SSE 모드로 교체, API 키 인증 추가
- `server_stdio.py` - 기존 stdio 모드 백업
- `generate_api_key.py` - API 키 생성 도구
- `.env.example` - API 키 설정 추가

### 주요 기능

- ✅ HTTP/SSE 기본 모드
- ✅ 원격 접속 지원
- ✅ API 키 보안
- ✅ CORS 설정
- ✅ 헬스체크 엔드포인트

### 보안

- 🔐 API 키 인증 (프로덕션 필수)
- 🔐 HTTPS 리버스 프록시 (권장)
- 🔐 방화벽 설정 (필수)
- 🔐 특정 IP만 허용 (권장)

이제 원격에서 안전하게 MCP 서버에 접속할 수 있습니다! 🎉
