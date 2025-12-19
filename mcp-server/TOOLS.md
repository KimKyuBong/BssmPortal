# MCP 도구 전체 목록

## 📊 통계

- **일반 사용자 도구**: 10개
- **관리자 도구**: 40개
- **총 도구**: 50개

## 👤 일반 사용자 도구 (10개)

### 내 정보 관리 (2개)
- `get_my_info` - 내 정보 조회
- `change_my_password` - 비밀번호 변경

### 장치 관리 (4개)
- `list_my_devices` - 내 장치 목록 조회
- `register_my_device` - 새 장치 등록
- `update_my_device` - 내 장치 정보 수정
- `delete_my_device` - 내 장치 삭제

### 대여 관리 (4개)
- `list_my_rentals` - 내 대여 내역 조회
- `view_available_equipment` - 대여 가능 장비 조회
- `request_rental` - 장비 대여 신청
- `request_return` - 장비 반납 신청

## 🔧 관리자 도구 (40개)

### 사용자 관리 (5개)
- `admin_list_users` - 사용자 목록 조회
- `admin_create_user` - 새 사용자 생성
- `admin_update_user` - 사용자 정보 수정
- `admin_delete_user` - 사용자 삭제
- `admin_reset_user_password` - 사용자 비밀번호 초기화

### 장치(IP) 관리 (8개)
- `admin_list_all_devices` - 전체 장치 목록 조회
- `admin_get_device_statistics` - 장치 통계 조회
- `admin_reassign_device_ip` - 장치 IP 재할당
- `admin_toggle_device_active` - 장치 활성화/비활성화 토글
- `admin_blacklist_ip` - IP 주소 블랙리스트 추가
- `admin_unblacklist_ip` - IP 주소 블랙리스트 제거
- `admin_list_blacklisted_ips` - 블랙리스트 IP 목록 조회
- `admin_get_device_history` - 장치 이력 조회

### 대여 관리 (7개)
- `admin_list_rental_requests` - 대여/반납 요청 목록 조회
- `admin_approve_rental_request` - 대여 요청 승인
- `admin_reject_rental_request` - 대여 요청 거절
- `admin_list_all_rentals` - 전체 대여 내역 조회
- `admin_process_return` - 반납 처리
- `admin_list_all_equipment` - 전체 장비 목록 조회
- `admin_create_equipment` - 새 장비 등록

### 방송 관리 (5개)
⚠️ **주의: 방송 도구는 실제로 방송을 송출하므로 테스트 시 주의하세요!**
- `admin_broadcast_text` - 텍스트 방송 송출 (테스트 금지!)
- `admin_get_broadcast_status` - 방송 시스템 상태 조회
- `admin_get_broadcast_history` - 방송 이력 조회
- `admin_get_device_matrix` - 방송 장치 매트릭스 조회
- `admin_delete_broadcast_history` - 방송 이력 삭제

### DNS 관리 (7개)
- `admin_list_dns_records` - DNS 레코드 목록 조회
- `admin_create_dns_record` - DNS 레코드 생성
- `admin_delete_dns_record` - DNS 레코드 삭제
- `admin_apply_dns_records` - DNS 레코드 변경사항 적용
- `admin_list_dns_requests` - DNS 요청 목록 조회
- `admin_approve_dns_request` - DNS 요청 승인
- `admin_reject_dns_request` - DNS 요청 거절

### SSL 인증서 관리 (5개)
- `admin_list_ssl_certificates` - SSL 인증서 목록 조회
- `admin_generate_ssl_certificate` - SSL 인증서 생성
- `admin_renew_ssl_certificate` - SSL 인증서 갱신
- `admin_revoke_ssl_certificate` - SSL 인증서 폐기
- `admin_get_expiring_certificates` - 만료 예정 인증서 조회

### 시스템 관리 (3개)
- `admin_get_system_status` - 시스템 전체 상태 조회
- `admin_refresh_health_data` - 시스템 헬스 데이터 새로고침
- `admin_get_pihole_stats` - Pi-hole 상세 통계 조회

## 🎯 주요 자동화 시나리오

### 1. IP 발급 자동화
```
관리자: "새로운 학생 10명에게 IP를 발급해줘"
→ admin_list_users (새 학생 조회)
→ admin_create_device (각 학생의 장치 등록)
→ IP 자동 할당 완료
```

### 2. 장비 대여 자동 승인
```
관리자: "대기 중인 맥북 대여 요청을 모두 승인해줘"
→ admin_list_rental_requests (대기 중인 요청 조회)
→ admin_approve_rental_request (각 요청 승인)
→ 대여 시작
```

### 3. 만료 예정 인증서 자동 갱신
```
시스템: "30일 이내 만료 예정 인증서를 갱신해줘"
→ admin_get_expiring_certificates (만료 예정 조회)
→ admin_renew_ssl_certificate (각 인증서 갱신)
→ 자동 갱신 완료
```

### 4. 블랙리스트 IP 관리
```
관리자: "비정상 트래픽을 발생시키는 IP 3개를 블랙리스트에 추가해줘"
→ admin_blacklist_ip (각 IP 블랙리스트 추가)
→ admin_reassign_device_ip (해당 장치 IP 재할당)
→ 차단 완료
```

### 5. DNS 레코드 일괄 생성
```
관리자: "새 도메인 5개에 대한 A 레코드를 생성해줘"
→ admin_create_dns_record (각 도메인 레코드 생성)
→ admin_apply_dns_records (변경사항 적용)
→ DNS 설정 완료
```

## 📈 도구 확장 내역

### v1.0 (초기 버전) - 22개 도구
- 일반 사용자: 10개
- 관리자: 12개

### v2.0 (현재 버전) - 50개 도구
- 일반 사용자: 10개
- 관리자: 40개

### 추가된 기능
- ✅ 장치(IP) 관리 (8개 도구)
- ✅ 방송 관리 (5개 도구)
- ✅ DNS 관리 (7개 도구)
- ✅ SSL 인증서 관리 (5개 도구)
- ✅ 시스템 관리 (3개 도구)
