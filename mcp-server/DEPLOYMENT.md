# ✅ MCP 서버 도커 배포 완료!

## 🎉 현재 상태

**MCP 서버가 성공적으로 실행 중입니다:**

```
✓ 컨테이너: bssm-mcp-server
✓ URL: http://10.129.55.253:3000
✓ 사용자: 김규봉 (관리자)
✓ 도구: 42개
✓ API 키 인증: 정상
✓ Health Check: http://10.129.55.253:3000/health
```

## 📡 Claude Desktop 연결 설정

### ⭐ 권장 설정 (SSE 타입)

```json
{
  "mcpServers": {
    "bssm-mcp": {
      "type": "sse",
      "url": "http://10.129.55.253:3000/sse",
      "headers": {
        "Authorization": "Bearer TlA8DebW5xg8nEY4Ij1rxxvDoK7c-WQKCy2YV_hyJcmyd8N5JKi1iEfWQ5nMmTNn"
      }
    }
  }
}
```

### 🔧 설정 파일 위치

- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### ✅ 설정 검증

```bash
# 1. 서버 헬스 체크
curl http://10.129.55.253:3000/health

# 2. SSE 엔드포인트 Content-Type 확인 (text/event-stream이어야 함)
curl -H "Authorization: Bearer TlA8DebW5xg8nEY4Ij1rxxvDoK7c-WQKCy2YV_hyJcmyd8N5JKi1iEfWQ5nMmTNn" \
     -I http://10.129.55.253:3000/sse

# 응답:
# content-type: text/event-stream; charset=utf-8 ✓
```

## 🚀 사용 방법

### 1. Claude Desktop 재시작

설정 파일 수정 후 **반드시 Claude Desktop을 완전히 종료하고 재시작**하세요.

### 2. 연결 확인

Claude Desktop을 시작하면 자동으로 MCP 서버에 연결됩니다.

### 3. 도구 사용

```
You: "내 장치 목록을 보여줘"

Claude: [MCP 도구 사용]
        list_my_devices() 실행...
        
결과: 등록된 장치 3개를 표시합니다.
```

## 🔒 보안

### API 키

```
TlA8DebW5xg8nEY4Ij1rxxvDoK7c-WQKCy2YV_hyJcmyd8N5JKi1iEfWQ5nMmTNn
```

이 키는 `.env` 파일에 저장되어 있습니다:
```bash
MCP_API_KEY=TlA8DebW5xg8nEY4Ij1rxxvDoK7c-WQKCy2YV_hyJcmyd8N5JKi1iEfWQ5nMmTNn
```

### 새 API 키 생성

```bash
cd /home/bssm/BssmCaptive/mcp-server
.venv/bin/python generate_api_key.py

# .env 파일 업데이트
# Claude Desktop 설정 파일 업데이트
# 도커 컨테이너 재시작
docker-compose restart mcp-server
```

## 🐳 도커 관리

### 서버 상태 확인
```bash
docker ps | grep mcp
docker logs bssm-mcp-server --tail 50
```

### 서버 재시작
```bash
docker-compose restart mcp-server
```

### 서버 재빌드 (코드 변경 시)
```bash
docker-compose up -d --build mcp-server
```

### 서버 중지
```bash
docker-compose stop mcp-server
```

### 로그 실시간 보기
```bash
docker logs -f bssm-mcp-server
```

## 🛠️ 문제 해결

### "Invalid content type" 오류

**원인**: API 키가 없거나 잘못됨

**해결**:
1. Claude Desktop 설정에 `Authorization` 헤더 확인
2. API 키가 정확한지 확인
3. `Bearer ` 접두사 포함되었는지 확인

```json
"headers": {
  "Authorization": "Bearer API키"  // "Bearer " 포함!
}
```

### "Unable to connect" 오류

**원인**: 서버가 실행 중이 아니거나 네트워크 문제

**해결**:
```bash
# 서버 실행 확인
docker ps | grep mcp

# 네트워크 확인
ping 10.129.55.253

# 포트 확인
curl http://10.129.55.253:3000/health

# 서버 재시작
docker-compose restart mcp-server
```

### SSE 연결이 끊김

**원인**: 네트워크 타임아웃

**해결**: SSE는 장시간 연결이므로 정상입니다. Claude Desktop이 자동으로 재연결합니다.

## 📋 체크리스트

MCP 서버 배포 완료 체크리스트:

- [x] Docker 이미지 빌드 완료
- [x] 컨테이너 실행 중 (bssm-mcp-server)
- [x] Django 로그인 성공 (김규봉)
- [x] Health Check 정상
- [x] API 키 인증 작동
- [x] SSE Content-Type 정상 (text/event-stream)
- [x] 42개 도구 로드 완료
- [ ] Claude Desktop 설정 완료
- [ ] Claude Desktop 연결 테스트
- [ ] 도구 실행 테스트

## 🎯 다음 단계

### 1. Claude Desktop 설정
위의 JSON 설정을 `claude_desktop_config.json`에 추가

### 2. Claude Desktop 재시작
완전히 종료 후 재시작

### 3. 연결 테스트
Claude에게 "내 장치 목록 보여줘" 등 요청

### 4. 문제 발생 시
- Claude Desktop 로그 확인: `~/.config/Claude/logs/`
- MCP 서버 로그 확인: `docker logs bssm-mcp-server`

## 🎉 성공!

MCP 서버가 도커에서 성공적으로 실행 중입니다!

이제 Claude Desktop에서 자연어로 BSSM Captive Portal을 관리할 수 있습니다:
- "대기 중인 대여 요청 보여줘"
- "비활성 장치 IP 재할당해줘"
- "30일 이내 만료 예정 SSL 인증서 갱신해줘"
- "블랙리스트 IP 목록 조회해줘"

**원격에서도 안전하게 접속 가능합니다!** 🚀
