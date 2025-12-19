# BSSM Captive Portal MCP Server - 빠른 시작 (v2.0)

## 🎉 최신 변경사항

### ✅ HTTP/SSE가 기본 모드입니다!
- **파일**: `server.py` (HTTP/SSE) ⭐ 기본
- **원격 접속**: ✅ 가능
- **API 키 보안**: ✅ 포함

### 🔐 보안 강화
- API 키 인증 시스템
- CORS 지원
- 원격 접속 보호

## 🚀 3단계 시작

### 1. API 키 생성
```bash
cd /home/bssm/BssmCaptive/mcp-server
.venv/bin/python generate_api_key.py
```

생성된 API 키를 복사하세요!

### 2. .env 파일 설정
```bash
nano .env

# 다음 추가:
MCP_API_KEY=생성된_API_키_붙여넣기
```

### 3. 서버 실행
```bash
./run.sh
# 또는
.venv/bin/python server.py

# 로그인:
사용자명: admin
비밀번호: ********
```

## 🌐 접속

### 로컬
```bash
# 헬스체크
curl http://localhost:3000/health

# SSE 연결
curl -H "X-API-Key: API키" http://localhost:3000/sse
```

### 원격
```bash
curl -H "X-API-Key: API키" http://서버IP:3000/sse
```

### Claude Desktop
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

## 📊 전체 도구 (45개)

- 일반 사용자: 10개
- 관리자: 35개 (장치/DNS/SSL/시스템 관리 포함)

## 📝 모드 선택

### HTTP 모드 (기본)
```bash
.venv/bin/python server.py
# URL: http://0.0.0.0:3000
```

### stdio 모드 (로컬전용)
```bash
.venv/bin/python server_stdio.py
# Claude Desktop 전용
```

## 🔧 문제 해결

### API 키 오류
```bash
# 새 키 생성
.venv/bin/python generate_api_key.py

# .env 업데이트
nano .env
```

### 원격 접속 안됨
```bash
# 방화벽 확인
sudo ufw allow 3000/tcp

# 포트 확인
netstat -tuln | grep 3000
```

## 📚 상세 문서

- `HTTP_MODE.md` - HTTP/API 키 완전 가이드
- `TOOLS.md` - 전체 도구 목록
- `AUTHENTICATION.md` - 인증 상세
- `SUMMARY.md` - 프로젝트 요약

## ⚡ 한 줄 요약

```bash
# API 키 생성 → .env 설정 → 서버 실행 → 완료!
.venv/bin/python generate_api_key.py && \
echo "MCP_API_KEY=생성된키" >> .env && \
.venv/bin/python server.py
```

**이제 원격에서 안전하게 접속 가능합니다!** 🎉
