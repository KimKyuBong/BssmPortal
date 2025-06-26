# 🖥️ 실시간 헬스체크 시스템

백엔드에서 제공하는 실시간 시스템 모니터링 및 Pi-hole 통계 시스템입니다.
0.5초마다 업데이트되는 실시간 데이터를 제공합니다.

## ✨ 주요 기능

### 📊 시스템 모니터링
- **CPU 사용률** - 실시간 CPU 사용량 및 주파수
- **메모리 사용률** - RAM 및 스왑 메모리 사용량
- **디스크 사용률** - 디스크 공간 및 I/O 통계
- **네트워크 상태** - 연결성 및 트래픽 통계
- **시스템 정보** - 가동시간, 프로세스 수, 시스템 로드

### 🛡️ Pi-hole 통계
- **실시간 차단 통계** - 오늘 차단된 쿼리 수
- **DNS 쿼리 통계** - 총 DNS 쿼리 수
- **차단률** - 차단된 요청의 비율
- **도메인 통계** - 차단된 도메인 수
- **클라이언트 통계** - 연결된 클라이언트 수

### ⚡ 실시간 업데이트
- **0.5초 간격** - 매우 빠른 업데이트 주기
- **WebSocket 지원** - 실시간 양방향 통신
- **REST API** - 기존 시스템과 호환
- **자동 재연결** - 연결 끊김 시 자동 복구

## 🚀 설치 및 설정

### 1. 의존성 설치

```bash
# 필요한 Python 패키지가 이미 requirements.txt에 추가됨
pip install channels channels-redis

# 또는 전체 의존성 재설치
pip install -r requirements.txt
```

### 2. Redis 설치 (선택사항)

WebSocket을 위해 Redis가 권장되지만, 개발 환경에서는 인메모리 레이어도 사용 가능합니다.

```bash
# Ubuntu/Debian
sudo apt install redis-server

# CentOS/RHEL
sudo yum install redis

# Redis 서비스 시작
sudo systemctl start redis
sudo systemctl enable redis
```

### 3. 설정 확인

`back/config/settings.py`에서 Channels 설정이 올바른지 확인하세요:

```python
# Redis 사용 (권장)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}

# Redis 없는 개발 환경 (대안)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}
```

## 🔧 API 엔드포인트

### REST API

#### 1. 시스템 상태 조회
```
GET /api/system/status/
```
**권한**: 관리자 또는 교사  
**응답**: 전체 시스템 및 Pi-hole 상태

#### 2. 헬스체크 새로고침
```
POST /api/system/health/refresh/
```
**권한**: 관리자 또는 교사  
**기능**: 캐시된 헬스체크 데이터 강제 새로고침

#### 3. Pi-hole 상세 통계
```
GET /api/system/pihole/stats/
```
**권한**: 관리자 또는 교사  
**응답**: Pi-hole 상세 통계 정보

### WebSocket API

#### 실시간 헬스체크 스트림
```
ws://your-domain/ws/system/health/
```
**권한**: 관리자 또는 교사  
**기능**: 0.5초마다 헬스체크 데이터 실시간 스트리밍

## 🧪 테스트 방법

### 1. REST API 테스트

```bash
# 테스트 스크립트 실행
cd back
python test_health_api.py
```

이 스크립트는 다음을 테스트합니다:
- 로그인 및 토큰 획득
- 시스템 상태 API 호출
- Pi-hole 통계 API 호출
- 헬스체크 새로고침 API 호출
- 10초간 실시간 업데이트 모니터링

### 2. WebSocket 테스트

```bash
# WebSocket 테스트 스크립트 실행
cd back
pip install websockets  # 필요한 경우
python test_websocket.py
```

### 3. 웹 브라우저 테스트

개발 서버가 실행 중일 때:
```
http://127.0.0.1:8000/static/health_monitor.html
```

## 📊 사용 예시

### Python에서 API 호출

```python
import requests

# 로그인
login_data = {'username': 'admin', 'password': 'your_password'}
response = requests.post('http://127.0.0.1:8000/api/auth/login/', json=login_data)
token = response.json()['access']

# 헬스체크 데이터 가져오기
headers = {'Authorization': f'Bearer {token}'}
response = requests.get('http://127.0.0.1:8000/api/system/status/', headers=headers)
health_data = response.json()

print(f"시스템 상태: {health_data['status']}")
print(f"CPU 사용률: {health_data['system']['cpu']['usage_percent']}%")
print(f"Pi-hole 차단 수: {health_data['pihole']['blocked_today']}")
```

### JavaScript에서 WebSocket 사용

```javascript
const socket = new WebSocket('ws://127.0.0.1:8000/ws/system/health/');

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'health_update') {
        const healthData = data.data;
        console.log('시스템 상태:', healthData.status);
        console.log('CPU:', healthData.system.cpu.usage_percent + '%');
    }
};
```

## ⚙️ 설정 옵션

### 업데이트 주기 변경

`back/system/views.py`에서 업데이트 간격을 조정할 수 있습니다:

```python
# 0.5초에서 다른 값으로 변경
time.sleep(0.5)  # 이 값을 변경

# 캐시 타임아웃도 함께 조정
CACHE_TIMEOUT = 1  # 초 단위
```

### Pi-hole 호스트 변경

Docker Compose 설정과 일치하도록 Pi-hole 호스트를 변경할 수 있습니다:

```python
# back/system/views.py
PIHOLE_HOST = "127.0.0.1:8888"  # Pi-hole 호스트:포트
```

## 🐛 문제 해결

### 1. Pi-hole 연결 실패

**증상**: Pi-hole 상태가 'offline'으로 표시  
**해결책**:
- Pi-hole 컨테이너가 실행 중인지 확인
- 포트 8888이 올바르게 포워딩되었는지 확인
- Docker Compose에서 Pi-hole 설정 확인

### 2. WebSocket 연결 실패

**증상**: WebSocket 연결이 거부됨  
**해결책**:
- Redis가 실행 중인지 확인
- 인메모리 채널 레이어로 전환
- 인증 토큰이 올바른지 확인

### 3. 높은 CPU 사용률

**증상**: 헬스체크 시스템이 CPU를 많이 사용  
**해결책**:
- 업데이트 간격을 늘리기 (0.5초 → 1초)
- 백그라운드 스레드 수 제한
- 캐시 타임아웃 조정

### 4. 권한 오류

**증상**: API 호출 시 403 Forbidden  
**해결책**:
- 관리자 또는 교사 권한 확인
- JWT 토큰이 유효한지 확인
- 로그인 상태 확인

## 📝 로그 확인

시스템 로그를 확인하여 문제를 진단할 수 있습니다:

```bash
# Django 로그 확인
tail -f back/django.log

# 특정 모듈 로그 필터링
grep "system" back/django.log
grep "health" back/django.log
```

## 🔮 향후 개선 사항

- [ ] 그래프 및 차트 시각화
- [ ] 알림 및 임계값 설정
- [ ] 히스토리 데이터 저장
- [ ] 모바일 앱 지원
- [ ] 다중 서버 모니터링
- [ ] 커스텀 메트릭 추가

## 🤝 기여 방법

1. 이슈 리포트: 버그나 개선 사항 제안
2. 코드 리뷰: 코드 품질 향상 제안
3. 문서 개선: README 및 주석 개선
4. 테스트 추가: 더 많은 테스트 케이스 작성

---

**만든 이**: AI Assistant  
**버전**: 1.0.0  
**마지막 업데이트**: 2025년 1월 