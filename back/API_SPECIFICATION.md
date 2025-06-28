# 방송 시스템 API 명세서

## 개요
Django 백엔드와 FastAPI 방송 서버를 연동한 방송 시스템 API입니다.
- **기본 URL**: `http://localhost:8000/api/broadcast/`
- **인증**: JWT 토큰 필요 (Bearer Token)
- **권한**: 교사(`is_staff=True`)만 방송 요청 가능

## 인증
모든 API 요청에는 JWT 토큰이 필요합니다.
```
Authorization: Bearer <JWT_TOKEN>
```

## 1. 방송 시스템 상태 확인

### GET /api/broadcast/status/
시스템 상태를 확인합니다.

**응답 예시:**
```json
{
  "success": true,
  "message": "방송 시스템 상태를 성공적으로 조회했습니다.",
  "status": {
    "total_devices": 64,
    "recent_broadcasts": 22,
    "total_audio_files": 0,
    "system_healthy": true
  }
}
```

## 2. 텍스트 방송

### POST /api/broadcast/broadcast/text/
텍스트 방송을 실행합니다. **교사 권한 필요**

**요청 데이터:**
```json
{
  "text": "안녕하세요. 테스트 방송입니다.",
  "target_rooms": ["315", "316"],
  "language": "ko",
  "auto_off": false
}
```

**필드 설명:**
- `text` (필수): 방송할 텍스트 (최대 500자)
- `target_rooms` (선택): 방송할 방 번호 목록 (예: ["315", "316"])
- `language` (선택): 언어 코드 (기본값: "ko")
- `auto_off` (선택): 방송 후 자동 끄기 (기본값: false)

**응답 예시:**
```json
{
  "success": true,
  "message": "텍스트 방송이 성공적으로 실행되었습니다.",
  "broadcast_id": 23
}
```

## 3. 오디오 방송

### POST /api/broadcast/broadcast/audio/
오디오 파일을 방송합니다. **교사 권한 필요**

**요청 형식:** `multipart/form-data`

**요청 데이터:**
```
audio_file: [파일] (필수)
target_rooms: ["315", "316"] (선택)
auto_off: false (선택)
```

**파일 제한:**
- 지원 형식: mp3, wav, ogg, m4a
- 최대 크기: 50MB (설정 가능)

**응답 예시:**
```json
{
  "success": true,
  "message": "오디오 방송이 성공적으로 실행되었습니다.",
  "broadcast_id": 24,
  "django_content": "오디오 파일: test2.mp3",
  "target_rooms": ["315"],
  "auto_off": false,
  "status": "completed",
  "created_at": "2025-06-28T16:12:11.811526"
}
```

## 4. 방송 이력 조회

### GET /api/broadcast/history/
방송 이력을 조회합니다.

**쿼리 파라미터:**
- `limit` (선택): 조회할 이력 수 (기본값: 50)

**응답 예시:**
```json
{
  "success": true,
  "message": "방송 이력을 성공적으로 조회했습니다.",
  "history": [
    {
      "id": 24,
      "broadcast_type": "audio",
      "broadcast_type_display": "음성 방송",
      "content": "오디오 파일: test2.mp3",
      "target_rooms": ["315"],
      "language": "ko",
      "auto_off": false,
      "status": "completed",
      "status_display": "완료",
      "broadcasted_by_username": "teacher1",
      "created_at": "2025-06-28T16:12:11.811526",
      "completed_at": "2025-06-28T16:12:12.123456"
    }
  ],
  "total_count": 1
}
```

## 5. 장치 매트릭스 조회

### GET /api/broadcast/device-matrix/
장치 매트릭스 정보를 조회합니다.

**응답 예시:**
```json
{
  "success": true,
  "message": "장치 매트릭스를 성공적으로 조회했습니다.",
  "matrix": [
    [
      {
        "id": 1,
        "device_name": "모학12",
        "room_id": 315,
        "position_row": 3,
        "position_col": 15,
        "matrix_row": 0,
        "matrix_col": 0,
        "is_active": true,
        "created_at": "2025-06-28T06:19:00.000000",
        "updated_at": "2025-06-28T06:19:00.000000"
      }
    ]
  ],
  "total_rows": 1,
  "total_cols": 1,
  "total_devices": 1
}
```

## 6. 오디오 파일 관리

### GET /api/broadcast/audio-files/
업로드된 오디오 파일 목록을 조회합니다.

**응답 예시:**
```json
{
  "success": true,
  "message": "오디오 파일 목록을 성공적으로 조회했습니다.",
  "files": [
    {
      "id": 1,
      "file": "/media/audio/2/20250628/test2.mp3",
      "file_url": "http://localhost:8000/media/audio/2/20250628/test2.mp3",
      "original_filename": "test2.mp3",
      "file_size": 9281070,
      "file_size_mb": 8.85,
      "duration": null,
      "uploaded_by_username": "teacher1",
      "created_at": "2025-06-28T16:12:11.811526",
      "is_active": true
    }
  ]
}
```

### POST /api/broadcast/audio-files/
오디오 파일을 업로드합니다.

**요청 형식:** `multipart/form-data`

**요청 데이터:**
```
audio_file: [파일] (필수)
```

**응답 예시:**
```json
{
  "success": true,
  "message": "오디오 파일이 성공적으로 업로드되었습니다.",
  "file": {
    "id": 2,
    "file": "/media/audio/2/20250628/new_audio.mp3",
    "file_url": "http://localhost:8000/media/audio/2/20250628/new_audio.mp3",
    "original_filename": "new_audio.mp3",
    "file_size": 1024000,
    "file_size_mb": 0.98,
    "duration": null,
    "uploaded_by_username": "teacher1",
    "created_at": "2025-06-28T16:15:00.000000",
    "is_active": true
  }
}
```

## 에러 응답

### 권한 없음 (403 Forbidden)
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 인증 필요 (401 Unauthorized)
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 잘못된 요청 (400 Bad Request)
```json
{
  "success": false,
  "message": "입력 데이터가 유효하지 않습니다.",
  "errors": {
    "text": ["방송할 텍스트를 입력해주세요."],
    "target_rooms": ["방 번호는 숫자여야 합니다."]
  }
}
```

### 서버 오류 (500 Internal Server Error)
```json
{
  "success": false,
  "message": "오디오 방송 실행에 실패했습니다.",
  "error": "FastAPI 서버 연결 실패"
}
```

## 사용 예시

### JavaScript (fetch)
```javascript
// 텍스트 방송
const response = await fetch('/api/broadcast/broadcast/text/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: '안녕하세요. 테스트 방송입니다.',
    target_rooms: ['315'],
    language: 'ko',
    auto_off: false
  })
});

// 오디오 방송
const formData = new FormData();
formData.append('audio_file', file);
formData.append('target_rooms', JSON.stringify(['315']));
formData.append('auto_off', 'false');

const response = await fetch('/api/broadcast/broadcast/audio/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Python (requests)
```python
import requests

# 텍스트 방송
response = requests.post(
    'http://localhost:8000/api/broadcast/broadcast/text/',
    headers={'Authorization': f'Bearer {token}'},
    json={
        'text': '안녕하세요. 테스트 방송입니다.',
        'target_rooms': ['315'],
        'language': 'ko',
        'auto_off': False
    }
)

# 오디오 방송
with open('test.mp3', 'rb') as f:
    files = {'audio_file': f}
    data = {
        'target_rooms': ['315'],
        'auto_off': 'false'
    }
    response = requests.post(
        'http://localhost:8000/api/broadcast/broadcast/audio/',
        headers={'Authorization': f'Bearer {token}'},
        files=files,
        data=data
    )
```

## 주의사항

1. **권한**: 방송 요청은 교사(`is_staff=True`)만 가능합니다.
2. **파일 크기**: 오디오 파일은 최대 50MB까지 업로드 가능합니다.
3. **방 번호**: 방 번호는 문자열 배열로 전송하되, 숫자만 포함해야 합니다.
4. **동시 방송**: 여러 방송 요청이 동시에 들어오면 FastAPI 서버의 대기열에 순차적으로 추가됩니다.
5. **파일 형식**: 오디오 파일은 mp3, wav, ogg, m4a 형식만 지원합니다.