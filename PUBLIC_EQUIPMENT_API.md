# 공개 장비 조회 API

일련번호를 통해 장비 정보와 대여이력을 조회할 수 있는 공개 API입니다.

## 엔드포인트

### 1. 장비 상세 정보 조회
```
GET /public/equipment/{serial_number}/
```

**설명**: 일련번호로 장비의 상세 정보, 대여이력, 장비 이력을 모두 조회합니다.

**응답 예시**:
```json
{
  "success": true,
  "equipment": {
    "id": 1,
    "asset_number": "ASSET-001",
    "manufacturer": "Apple",
    "model_name": "MacBook Pro 13",
    "equipment_type": "MACBOOK",
    "equipment_type_display": "맥북",
    "serial_number": "ABC123456789",
    "description": "개발용 맥북",
    "status": "RENTED",
    "status_display": "대여 중",
    "acquisition_date": "2023-01-15",
    "manufacture_year": 2023,
    "management_number": "M-2023-01-001",
    "created_at": "2023-01-15T10:00:00Z"
  },
  "rental_history": [
    {
      "id": 1,
      "rental_date": "2023-01-20T09:00:00Z",
      "due_date": "2023-12-31T23:59:59Z",
      "return_date": null,
      "status": "RENTED",
      "status_display": "대여 중",
      "notes": "",
      "user_name": "홍길동",
      "created_at": "2023-01-20T09:00:00Z"
    }
  ],
  "equipment_history": [
    {
      "id": 1,
      "action_type": "STATUS_CHANGE",
      "action_display": "상태 변경",
      "details": "상태가 AVAILABLE에서 RENTED로 변경됨",
      "created_at": "2023-01-20T09:00:00Z"
    }
  ],
  "total_rentals": 1,
  "total_history_entries": 1
}
```

### 2. 장비 상태 정보 조회
```
GET /public/equipment/{serial_number}/status/
```

**설명**: 일련번호로 장비의 기본 상태 정보만 간단히 조회합니다.

**응답 예시**:
```json
{
  "success": true,
  "serial_number": "ABC123456789",
  "asset_number": "ASSET-001",
  "manufacturer": "Apple",
  "model_name": "MacBook Pro 13",
  "equipment_type": "MACBOOK",
  "equipment_type_display": "맥북",
  "status": "RENTED",
  "status_display": "대여 중",
  "management_number": "M-2023-01-001",
  "is_rented": true,
  "current_renter": {
    "username": "honggildong",
    "name": "홍길동",
    "rental_date": "2023-01-20T09:00:00Z",
    "due_date": "2023-12-31T23:59:59Z"
  }
}
```

## 오류 응답

### 장비를 찾을 수 없는 경우 (404)
```json
{
  "success": false,
  "message": "해당 일련번호의 장비를 찾을 수 없습니다.",
  "serial_number": "INVALID_SERIAL"
}
```

### 서버 오류 (500)
```json
{
  "success": false,
  "message": "장비 정보 조회 중 오류가 발생했습니다.",
  "error": "오류 상세 내용"
}
```

## 사용 예시

### curl 명령어
```bash
# 장비 상세 정보 조회
curl -X GET "http://localhost:8000/public/equipment/ABC123456789/"

# 장비 상태 정보 조회
curl -X GET "http://localhost:8000/public/equipment/ABC123456789/status/"
```

### JavaScript (fetch)
```javascript
// 장비 상세 정보 조회
fetch('/public/equipment/ABC123456789/')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('장비 정보:', data.equipment);
      console.log('대여이력:', data.rental_history);
    } else {
      console.error('오류:', data.message);
    }
  });

// 장비 상태 정보 조회
fetch('/public/equipment/ABC123456789/status/')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('장비 상태:', data.status);
      console.log('대여 여부:', data.is_rented);
    } else {
      console.error('오류:', data.message);
    }
  });
```

## 보안 고려사항

- 이 API는 인증 없이 접근 가능합니다.
- 개인정보 보호를 위해 사용자의 상세 정보는 제한적으로만 제공됩니다.
- 민감한 정보(구매가격, 내부 관리 정보 등)는 제외됩니다.
- 로그에 접근 기록이 남습니다.

## 주의사항

- 일련번호는 대소문자를 구분합니다.
- 존재하지 않는 일련번호로 요청하면 404 오류가 반환됩니다.
- API 호출 제한이 있을 수 있습니다 (추후 구현 예정).
