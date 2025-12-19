# Claude Desktop 연동 가이드

## 🎯 완벽 지원!

이제 Claude Desktop의 **"remote"** 타입을 완벽하게 지원합니다.

## 📡 연결 설정

### Claude Desktop 설정 파일

**Linux:** `~/.config/Claude/claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### 설정 방법 (권장)

```json
{
  "mcpServers": {
    "bssm-mcp": {
      "type": "remote",
      "url": "http://10.129.55.253:3000/mcp",
      "headers": {
        "Authorization": "Bearer TlA8DebW5xg8nEY4Ij1rxxvDoK7c-WQKCy2YV_hyJcmyd8N5JKi1iEfWQ5nMmTNn"
      }
    }
  }
}
```

### 지원하는 인증 방식

#### 1. Authorization Bearer (권장) ⭐
```json
{
  "type": "remote",
  "url": "http://서버IP:3000/mcp",
  "headers": {
    "Authorization": "Bearer 생성된_API_키"
  }
}
```

#### 2. X-API-Key 헤더
```json
{
  "type": "remote",
  "url": "http://서버IP:3000/mcp",
  "headers": {
    "X-API-Key": "생성된_API_키"
  }
}
```

#### 3. SSE 모드 (대안)
```json
{
  "type": "sse",
  "url": "http://서버IP:3000/sse",
  "headers": {
    "Authorization": "Bearer 생성된_API_키"
  }
}
```

## 🚀 빠른 시작

### 1. API 키 확인

```bash
cd /home/bssm/BssmCaptive/mcp-server
cat .api_keys.json
```

이미 생성된 키:
```
TlA8DebW5xg8nEY4Ij1rxxvDoK7c-WQKCy2YV_hyJcmyd8N5JKi1iEfWQ5nMmTNn
```

### 2. 서버 실행

```bash
# .env에 API 키 설정 확인
grep MCP_API_KEY .env

# 서버 시작
.venv/bin/python server.py
```

### 3. Claude Desktop 설정

위의 JSON을 복사하여 `claude_desktop_config.json`에 추가

### 4. Claude Desktop 재시작

설정 후 Claude Desktop을 완전히 종료하고 다시 시작

## ✅ 연결 테스트

### 수동 테스트

```bash
# 서버 정보 조회 (API 키 포함)
curl -H "Authorization: Bearer TlA8DebW5xg8nEY4Ij1rxxvDoK7c-WQKCy2YV_hyJcmyd8N5JKi1iEfWQ5nMmTNn" \
     http://10.129.55.253:3000/mcp

# 헬스체크 (API 키 불필요)
curl http://10.129.55.253:3000/health
```

### Claude Desktop에서

```
You: "내 장치 목록을 보여줘"

Claude: [MCP 도구 사용]
        list_my_devices() 실행
        결과 표시...
```

## 🔧 문제 해결

### 연결이 안됩니다

1. **서버 실행 확인**
```bash
curl http://10.129.55.253:3000/health
```

2. **방화벽 확인**
```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

3. **네트워크 확인**
```bash
ping 10.129.55.253
```

### API 키 오류

```json
{
  "error": "Unauthorized",
  "message": "유효하지 않은 API 키입니다."
}
```

**해결:**
1. `.env` 파일에 `MCP_API_KEY` 설정 확인
2. Claude Desktop 설정의 API 키와 일치하는지 확인
3. 서버 재시작

### Claude Desktop이 도구를 찾지 못합니다

1. **로그 확인**
```bash
# Linux/macOS
tail -f ~/.config/Claude/logs/mcp*.log
```

2. **설정 파일 문법 확인**
   - JSON 형식이 올바른지
   - 쉼표, 중괄호 확인

3. **Claude Desktop 완전 재시작**
   - 프로세스 종료 확인
   - 다시 시작

## 📊 엔드포인트 비교

| 경로 | 타입 | 용도 |
|------|------|------|
| `/mcp` | remote | **Claude Desktop 권장** ⭐ |
| `/sse` | sse | 스트리밍 연결 |
| `/health` | - | 상태 확인 |

## 🌐 원격 접속 예시

### 로컬 네트워크
```json
{
  "type": "remote",
  "url": "http://192.168.1.100:3000/mcp",
  "headers": {
    "Authorization": "Bearer API_키"
  }
}
```

### 공인 IP (방화벽 설정 필요)
```json
{
  "type": "remote",
  "url": "http://공인IP:3000/mcp",
  "headers": {
    "Authorization": "Bearer API_키"
  }
}
```

### 도메인 (Nginx 프록시)
```json
{
  "type": "remote",
  "url": "https://mcp.bssm.hs.kr/mcp",
  "headers": {
    "Authorization": "Bearer API_키"
  }
}
```

## 🔒 보안 권장사항

### 프로덕션 환경

1. **HTTPS 사용** (Nginx + Let's Encrypt)
```json
{
  "url": "https://mcp.bssm.hs.kr/mcp"
}
```

2. **방화벽 제한**
```bash
# 특정 IP만 허용
sudo ufw allow from 학교_IP_대역 to any port 3000
```

3. **API 키 주기적 변경**
```bash
.venv/bin/python generate_api_key.py
# .env 업데이트
# Claude Desktop 설정 업데이트
```

## 💡 팁

### 여러 클라이언트 연결

현재는 하나의 API 키를 여러 클라이언트가 공유합니다.

```json
// Claude Desktop 1
{
  "bssm-mcp": {
    "type": "remote",
    "url": "http://서버IP:3000/mcp",
    "headers": {
      "Authorization": "Bearer 동일한_키"
    }
  }
}

// Claude Desktop 2 (다른 컴퓨터)
{
  "bssm-mcp": {
    "type": "remote",
    "url": "http://서버IP:3000/mcp",
    "headers": {
      "Authorization": "Bearer 동일한_키"
    }
  }
}
```

### 로컬 + 원격 함께 사용

```json
{
  "mcpServers": {
    "bssm-local": {
      "type": "sse",
      "url": "http://localhost:3000/sse",
      "headers": {
        "Authorization": "Bearer API_키"
      }
    },
    "bssm-remote": {
      "type": "remote",
      "url": "http://서버IP:3000/mcp",
      "headers": {
        "Authorization": "Bearer API_키"
      }
    }
  }
}
```

## ✅ 체크리스트

- [ ] MCP 서버 실행 중
- [ ] API 키 생성 및 .env 설정
- [ ] Claude Desktop 설정 파일 수정
- [ ] 네트워크 연결 확인 (ping)
- [ ] 방화벽 포트 3000 열림
- [ ] Claude Desktop 재시작
- [ ] 연결 테스트 완료

## 🎉 완료!

이제 어디서든 Claude Desktop으로 BSSM Captive Portal을 관리할 수 있습니다!
