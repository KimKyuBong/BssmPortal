"""
MCP Tools Definition
모든 MCP 도구의 스키마 정의
"""
from mcp.types import Tool


def get_user_tools():
    """일반 사용자 도구 정의"""
    return [
        Tool(
            name="get_my_info",
            description="현재 로그인한 사용자의 정보를 조회합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="change_my_password",
            description="비밀번호를 변경합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "current_password": {"type": "string", "description": "현재 비밀번호"},
                    "new_password": {"type": "string", "description": "새 비밀번호"},
                    "confirm_password": {"type": "string", "description": "새 비밀번호 확인"}
                },
                "required": ["current_password", "new_password", "confirm_password"]
            }
        ),
        Tool(
            name="list_my_devices",
            description="내 장치 목록을 조회합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="register_my_device",
            description="새 장치를 등록합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "mac_address": {"type": "string", "description": "MAC 주소 (AA:BB:CC:DD:EE:FF)"},
                    "device_name": {"type": "string", "description": "장치 이름"}
                },
                "required": ["mac_address", "device_name"]
            }
        ),
        Tool(
            name="update_my_device",
            description="내 장치 정보를 수정합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "device_id": {"type": "integer", "description": "장치 ID"},
                    "device_name": {"type": "string", "description": "새 장치 이름"}
                },
                "required": ["device_id"]
            }
        ),
        Tool(
            name="delete_my_device",
            description="내 장치를 삭제합니다.",
            inputSchema={
                "type": "object",
                "properties": {"device_id": {"type": "integer", "description": "장치 ID"}},
                "required": ["device_id"]
            }
        ),
        Tool(
            name="list_my_rentals",
            description="내 대여 내역을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "대여 상태",
                        "enum": ["RENTED", "RETURNED", "OVERDUE", "LOST", "DAMAGED"]
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="view_available_equipment",
            description="대여 가능한 장비 목록을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "equipment_type": {
                        "type": "string",
                        "description": "장비 유형",
                        "enum": ["LAPTOP", "MACBOOK", "TABLET", "DESKTOP", "MONITOR", "KEYBOARD", "MOUSE", "OTHER"]
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="request_rental",
            description="장비 대여를 신청합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "equipment_id": {"type": "integer", "description": "장비 ID"},
                    "notes": {"type": "string", "description": "비고"}
                },
                "required": ["equipment_id"]
            }
        ),
        Tool(
            name="request_return",
            description="장비 반납을 신청합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "rental_id": {"type": "integer", "description": "대여 ID"},
                    "notes": {"type": "string", "description": "비고"}
                },
                "required": ["rental_id"]
            }
        ),
    ]


def get_admin_tools():
    """관리자 도구 정의 (방송 제외)"""
    return [
        # 사용자 관리 (5개)
        Tool(
            name="admin_list_users",
            description="[관리자] 사용자 목록을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "검색어"},
                    "is_staff": {"type": "boolean", "description": "관리자 필터"},
                    "page": {"type": "integer", "description": "페이지", "default": 1}
                },
                "required": []
            }
        ),
        Tool(
            name="admin_create_user",
            description="[관리자] 새 사용자를 생성합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "username": {"type": "string"},
                    "password": {"type": "string"},
                    "email": {"type": "string"},
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "is_staff": {"type": "boolean", "default": False}
                },
                "required": ["username", "password", "email"]
            }
        ),
        Tool(
            name="admin_update_user",
            description="[관리자] 사용자 정보를 수정합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer"},
                    "email": {"type": "string"},
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "is_staff": {"type": "boolean"},
                    "is_active": {"type": "boolean"}
                },
                "required": ["user_id"]
            }
        ),
        Tool(
            name="admin_delete_user",
            description="[관리자] 사용자를 삭제합니다.",
            inputSchema={
                "type": "object",
                "properties": {"user_id": {"type": "integer"}},
                "required": ["user_id"]
            }
        ),
        Tool(
            name="admin_reset_user_password",
            description="[관리자] 사용자 비밀번호를 초기화합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "integer"},
                    "new_password": {"type": "string"}
                },
                "required": ["user_id", "new_password"]
            }
        ),
        
        # 대여 관리 (7개)
        Tool(
            name="admin_list_rental_requests",
            description="[관리자] 대여/반납 요청 목록을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["PENDING", "APPROVED", "REJECTED"]},
                    "request_type": {"type": "string", "enum": ["RENTAL", "RETURN"]},
                    "page": {"type": "integer", "default": 1}
                },
                "required": []
            }
        ),
        Tool(
            name="admin_approve_rental_request",
            description="[관리자] 대여 요청을 승인합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "request_id": {"type": "integer"},
                    "notes": {"type": "string"}
                },
                "required": ["request_id"]
            }
        ),
        Tool(
            name="admin_reject_rental_request",
            description="[관리자] 대여 요청을 거절합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "request_id": {"type": "integer"},
                    "reason": {"type": "string"}
                },
                "required": ["request_id", "reason"]
            }
        ),
        Tool(
            name="admin_list_all_rentals",
            description="[관리자] 전체 대여 내역을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["RENTED", "RETURNED", "OVERDUE", "LOST", "DAMAGED"]},
                    "user_id": {"type": "integer"},
                    "page": {"type": "integer", "default": 1}
                },
                "required": []
            }
        ),
        Tool(
            name="admin_process_return",
            description="[관리자] 반납 처리를 수행합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "rental_id": {"type": "integer"},
                    "condition": {"type": "string", "enum": ["NORMAL", "DAMAGED", "LOST"], "default": "NORMAL"},
                    "notes": {"type": "string"}
                },
                "required": ["rental_id"]
            }
        ),
        Tool(
            name="admin_list_all_equipment",
            description="[관리자] 전체 장비 목록을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "equipment_type": {"type": "string", "enum": ["LAPTOP", "MACBOOK", "TABLET", "DESKTOP", "MONITOR", "KEYBOARD", "MOUSE", "OTHER"]},
                    "status": {"type": "string", "enum": ["AVAILABLE", "RENTED", "MAINTENANCE", "BROKEN", "LOST", "RETIRED"]},
                    "page": {"type": "integer", "default": 1}
                },
                "required": []
            }
        ),
        Tool(
            name="admin_create_equipment",
            description="[관리자] 새 장비를 등록합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "equipment_type": {"type": "string", "enum": ["LAPTOP", "MACBOOK", "TABLET", "DESKTOP", "MONITOR", "KEYBOARD", "MOUSE", "OTHER"]},
                    "model_name": {"type": "string"},
                    "serial_number": {"type": "string"},
                    "year": {"type": "integer"},
                    "notes": {"type": "string"}
                },
                "required": ["equipment_type", "model_name", "serial_number", "year"]
            }
        ),
        
        # 장치(IP) 관리 (8개)
        Tool(
            name="admin_list_all_devices",
            description="[관리자] 전체 장치 목록을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "search": {"type": "string"},
                    "is_active": {"type": "boolean"},
                    "page": {"type": "integer", "default": 1}
                },
                "required": []
            }
        ),
        Tool(
            name="admin_get_device_statistics",
            description="[관리자] 장치 통계를 조회합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="admin_reassign_device_ip",
            description="[관리자] 장치 IP를 재할당합니다.",
            inputSchema={
                "type": "object",
                "properties": {"device_id": {"type": "integer"}},
                "required": ["device_id"]
            }
        ),
        Tool(
            name="admin_toggle_device_active",
            description="[관리자] 장치 활성화/비활성화를 토글합니다.",
            inputSchema={
                "type": "object",
                "properties": {"device_id": {"type": "integer"}},
                "required": ["device_id"]
            }
        ),
        Tool(
            name="admin_blacklist_ip",
            description="[관리자] IP 주소를 블랙리스트에 추가합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "ip_address": {"type": "string"},
                    "reason": {"type": "string"}
                },
                "required": ["ip_address"]
            }
        ),
        Tool(
            name="admin_unblacklist_ip",
            description="[관리자] IP 주소를 블랙리스트에서 제거합니다.",
            inputSchema={
                "type": "object",
                "properties": {"ip_address": {"type": "string"}},
                "required": ["ip_address"]
            }
        ),
        Tool(
            name="admin_list_blacklisted_ips",
            description="[관리자] 블랙리스트 IP 목록을 조회합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="admin_get_device_history",
            description="[관리자] 장치 이력을 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "device_id": {"type": "integer"},
                    "action": {"type": "string", "enum": ["REGISTER", "UNREGISTER", "REASSIGN_IP_BLACKLIST"]},
                    "page": {"type": "integer", "default": 1}
                },
                "required": []
            }
        ),
        
        # DNS/SSL 관리 (9개)
        Tool(
            name="admin_list_dns_records",
            description="[관리자] DNS 레코드 목록을 조회합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="admin_create_dns_record",
            description="[관리자] DNS 레코드를 생성합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string"},
                    "record_type": {"type": "string"},
                    "value": {"type": "string"},
                    "ttl": {"type": "integer", "default": 3600}
                },
                "required": ["domain", "record_type", "value"]
            }
        ),
        Tool(
            name="admin_delete_dns_record",
            description="[관리자] DNS 레코드를 삭제합니다.",
            inputSchema={
                "type": "object",
                "properties": {"record_id": {"type": "integer"}},
                "required": ["record_id"]
            }
        ),
        Tool(
            name="admin_apply_dns_records",
            description="[관리자] DNS 레코드 변경사항을 적용합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="admin_list_ssl_certificates",
            description="[관리자] SSL 인증서 목록을 조회합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="admin_generate_ssl_certificate",
            description="[관리자] SSL 인증서를 생성합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string"},
                    "alternative_names": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["domain"]
            }
        ),
        Tool(
            name="admin_renew_ssl_certificate",
            description="[관리자] SSL 인증서를 갱신합니다.",
            inputSchema={
                "type": "object",
                "properties": {"certificate_id": {"type": "integer"}},
                "required": ["certificate_id"]
            }
        ),
        Tool(
            name="admin_revoke_ssl_certificate",
            description="[관리자] SSL 인증서를 폐기합니다.",
            inputSchema={
                "type": "object",
                "properties": {
                    "certificate_id": {"type": "integer"},
                    "reason": {"type": "string"}
                },
                "required": ["certificate_id", "reason"]
            }
        ),
        Tool(
            name="admin_get_expiring_certificates",
            description="[관리자] 만료 예정 인증서를 조회합니다.",
            inputSchema={
                "type": "object",
                "properties": {"days": {"type": "integer", "default": 30}},
                "required": []
            }
        ),
        
        # 시스템 관리 (3개)
        Tool(
            name="admin_get_system_status",
            description="[관리자] 시스템 상태를 조회합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="admin_refresh_health_data",
            description="[관리자] 시스템 헬스 데이터를 새로고침합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        Tool(
            name="admin_get_pihole_stats",
            description="[관리자] Pi-hole 통계를 조회합니다.",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
    ]
