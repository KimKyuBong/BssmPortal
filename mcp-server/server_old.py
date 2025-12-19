#!/usr/bin/env python3
"""
BSSM Captive Portal MCP Server
Django 백엔드와 연동하여 AI 에이전트를 통한 시스템 관리를 제공합니다.
"""
import asyncio
import sys
import os
from typing import Any, Sequence

# MCP SDK
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    INVALID_PARAMS,
    INTERNAL_ERROR,
)

# 로컬 모듈
from config import config
from auth import auth_manager

# 도구 임포트
from tools.user.profile_tools import (
    get_my_info,
    change_my_password,
    list_my_devices,
    register_my_device,
    update_my_device,
    delete_my_device,
    list_my_rentals,
    view_available_equipment,
    request_rental,
    request_return,
)

from tools.admin.user_tools import (
    list_users,
    create_user,
    update_user,
    delete_user,
    reset_user_password,
)

from tools.admin.rental_tools import (
    list_rental_requests,
    approve_rental_request,
    reject_rental_request,
    list_all_rentals,
    process_return,
    list_all_equipment,
    create_equipment,
)

from tools.admin.device_tools import (
    list_all_devices,
    get_device_statistics,
    reassign_device_ip,
    toggle_device_active,
    blacklist_ip,
    unblacklist_ip,
    list_blacklisted_ips,
    get_device_history,
)

from tools.admin.dns_tools import (
    list_dns_records,
    create_dns_record,
    delete_dns_record,
    apply_dns_records,
    list_ssl_certificates,
    generate_ssl_certificate,
    renew_ssl_certificate,
    revoke_ssl_certificate,
    get_expiring_certificates,
)

from tools.admin.system_tools import (
    get_system_status,
    refresh_health_data,
    get_pihole_stats,
)


# MCP 서버 인스턴스
app = Server(config.MCP_SERVER_NAME)


@app.list_tools()
async def list_tools() -> list[Tool]:
    """
    사용 가능한 MCP 도구 목록 반환
    사용자 권한에 따라 다른 도구 목록 제공
    """
    tools = []
    
    # 일반 사용자 도구 (모든 사용자)
    if auth_manager.is_authenticated:
        tools.extend([
            Tool(
                name="get_my_info",
                description="현재 로그인한 사용자의 정보를 조회합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            ),
            Tool(
                name="change_my_password",
                description="비밀번호를 변경합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "current_password": {
                            "type": "string",
                            "description": "현재 비밀번호"
                        },
                        "new_password": {
                            "type": "string",
                            "description": "새 비밀번호"
                        },
                        "confirm_password": {
                            "type": "string",
                            "description": "새 비밀번호 확인"
                        }
                    },
                    "required": ["current_password", "new_password", "confirm_password"]
                }
            ),
            Tool(
                name="list_my_devices",
                description="내 장치 목록을 조회합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            ),
            Tool(
                name="register_my_device",
                description="새 장치를 등록합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "mac_address": {
                            "type": "string",
                            "description": "MAC 주소 (형식: AA:BB:CC:DD:EE:FF)"
                        },
                        "device_name": {
                            "type": "string",
                            "description": "장치 이름"
                        }
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
                        "device_id": {
                            "type": "integer",
                            "description": "장치 ID"
                        },
                        "device_name": {
                            "type": "string",
                            "description": "새 장치 이름"
                        }
                    },
                    "required": ["device_id"]
                }
            ),
            Tool(
                name="delete_my_device",
                description="내 장치를 삭제합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "device_id": {
                            "type": "integer",
                            "description": "장치 ID"
                        }
                    },
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
                            "description": "대여 상태 필터 (RENTED, RETURNED, OVERDUE 등)",
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
                        "equipment_id": {
                            "type": "integer",
                            "description": "장비 ID"
                        },
                        "notes": {
                            "type": "string",
                            "description": "비고 (선택)"
                        }
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
                        "rental_id": {
                            "type": "integer",
                            "description": "대여 ID"
                        },
                        "notes": {
                            "type": "string",
                            "description": "비고 (선택)"
                        }
                    },
                    "required": ["rental_id"]
                }
            ),
        ])
    
    # 관리자 도구 (관리자만)
    if auth_manager.is_admin:
        tools.extend([
            # 사용자 관리
            Tool(
                name="admin_list_users",
                description="[관리자] 사용자 목록을 조회합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "search": {
                            "type": "string",
                            "description": "검색어 (사용자명, 이메일, 이름)"
                        },
                        "is_staff": {
                            "type": "boolean",
                            "description": "관리자 필터"
                        },
                        "page": {
                            "type": "integer",
                            "description": "페이지 번호",
                            "default": 1
                        }
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
                        "username": {
                            "type": "string",
                            "description": "사용자명"
                        },
                        "password": {
                            "type": "string",
                            "description": "비밀번호"
                        },
                        "email": {
                            "type": "string",
                            "description": "이메일"
                        },
                        "first_name": {
                            "type": "string",
                            "description": "이름"
                        },
                        "last_name": {
                            "type": "string",
                            "description": "성"
                        },
                        "is_staff": {
                            "type": "boolean",
                            "description": "관리자 여부",
                            "default": False
                        }
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
                        "user_id": {
                            "type": "integer",
                            "description": "사용자 ID"
                        },
                        "email": {
                            "type": "string",
                            "description": "이메일"
                        },
                        "first_name": {
                            "type": "string",
                            "description": "이름"
                        },
                        "last_name": {
                            "type": "string",
                            "description": "성"
                        },
                        "is_staff": {
                            "type": "boolean",
                            "description": "관리자 여부"
                        },
                        "is_active": {
                            "type": "boolean",
                            "description": "활성화 여부"
                        }
                    },
                    "required": ["user_id"]
                }
            ),
            Tool(
                name="admin_delete_user",
                description="[관리자] 사용자를 삭제합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "type": "integer",
                            "description": "사용자 ID"
                        }
                    },
                    "required": ["user_id"]
                }
            ),
            Tool(
                name="admin_reset_user_password",
                description="[관리자] 사용자 비밀번호를 초기화합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "type": "integer",
                            "description": "사용자 ID"
                        },
                        "new_password": {
                            "type": "string",
                            "description": "새 비밀번호"
                        }
                    },
                    "required": ["user_id", "new_password"]
                }
            ),
            # 대여 관리
            Tool(
                name="admin_list_rental_requests",
                description="[관리자] 대여/반납 요청 목록을 조회합니다.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "status": {
                            "type": "string",
                            "description": "요청 상태",
                            "enum": ["PENDING", "APPROVED", "REJECTED"]
                        },
                        "request_type": {
                            "type": "string",
                            "description": "요청 유형",
                            "enum": ["RENTAL", "RETURN"]
                        },
                        "page": {
                            "type": "integer",
                            "description": "페이지 번호",
                            "default": 1
                        }
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
                        "request_id": {
                            "type": "integer",
                            "description": "요청 ID"
                        },
                        "notes": {
                            "type": "string",
                            "description": "승인 메모"
                        }
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
                        "request_id": {
                            "type": "integer",
                            "description": "요청 ID"
                        },
                        "reason": {
                            "type": "string",
                            "description": "거절 사유"
                        }
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
                        "status": {
                            "type": "string",
                            "description": "대여 상태",
                            "enum": ["RENTED", "RETURNED", "OVERDUE", "LOST", "DAMAGED"]
                        },
                        "user_id": {
                            "type": "integer",
                            "description": "사용자 ID 필터"
                        },
                        "page": {
                            "type": "integer",
                            "description": "페이지 번호",
                            "default": 1
                        }
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
                        "rental_id": {
                            "type": "integer",
                            "description": "대여 ID"
                        },
                        "condition": {
                            "type": "string",
                            "description": "장비 상태",
                            "enum": ["NORMAL", "DAMAGED", "LOST"],
                            "default": "NORMAL"
                        },
                        "notes": {
                            "type": "string",
                            "description": "반납 메모"
                        }
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
                        "equipment_type": {
                            "type": "string",
                            "description": "장비 유형",
                            "enum": ["LAPTOP", "MACBOOK", "TABLET", "DESKTOP", "MONITOR", "KEYBOARD", "MOUSE", "OTHER"]
                        },
                        "status": {
                            "type": "string",
                            "description": "장비 상태",
                            "enum": ["AVAILABLE", "RENTED", "MAINTENANCE", "BROKEN", "LOST", "RETIRED"]
                        },
                        "page": {
                            "type": "integer",
                            "description": "페이지 번호",
                            "default": 1
                        }
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
                        "equipment_type": {
                            "type": "string",
                            "description": "장비 유형",
                            "enum": ["LAPTOP", "MACBOOK", "TABLET", "DESKTOP", "MONITOR", "KEYBOARD", "MOUSE", "OTHER"]
                        },
                        "model_name": {
                            "type": "string",
                            "description": "모델명"
                        },
                        "serial_number": {
                            "type": "string",
                            "description": "시리얼 번호"
                        },
                        "year": {
                            "type": "integer",
                            "description": "제조 연도"
                        },
                        "notes": {
                            "type": "string",
                            "description": "비고"
                        }
                    },
                    "required": ["equipment_type", "model_name", "serial_number", "year"]
                }
            ),
        ])
    
    return tools


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> Sequence[TextContent | ImageContent | EmbeddedResource]:
    """
    MCP 도구 실행
    """
    try:
        # 일반 사용자 도구
        if name == "get_my_info":
            result = await get_my_info()
        elif name == "change_my_password":
            result = await change_my_password(**arguments)
        elif name == "list_my_devices":
            result = await list_my_devices()
        elif name == "register_my_device":
            result = await register_my_device(**arguments)
        elif name == "update_my_device":
            result = await update_my_device(**arguments)
        elif name == "delete_my_device":
            result = await delete_my_device(**arguments)
        elif name == "list_my_rentals":
            result = await list_my_rentals(**arguments)
        elif name == "view_available_equipment":
            result = await view_available_equipment(**arguments)
        elif name == "request_rental":
            result = await request_rental(**arguments)
        elif name == "request_return":
            result = await request_return(**arguments)
        
        # 관리자 도구 - 사용자 관리
        elif name == "admin_list_users":
            result = await list_users(**arguments)
        elif name == "admin_create_user":
            result = await create_user(**arguments)
        elif name == "admin_update_user":
            result = await update_user(**arguments)
        elif name == "admin_delete_user":
            result = await delete_user(**arguments)
        elif name == "admin_reset_user_password":
            result = await reset_user_password(**arguments)
        
        # 관리자 도구 - 대여 관리
        elif name == "admin_list_rental_requests":
            result = await list_rental_requests(**arguments)
        elif name == "admin_approve_rental_request":
            result = await approve_rental_request(**arguments)
        elif name == "admin_reject_rental_request":
            result = await reject_rental_request(**arguments)
        elif name == "admin_list_all_rentals":
            result = await list_all_rentals(**arguments)
        elif name == "admin_process_return":
            result = await process_return(**arguments)
        elif name == "admin_list_all_equipment":
            result = await list_all_equipment(**arguments)
        elif name == "admin_create_equipment":
            result = await create_equipment(**arguments)
        
        else:
            raise ValueError(f"Unknown tool: {name}")
        
        # 결과를 JSON 문자열로 변환
        import json
        result_text = json.dumps(result, ensure_ascii=False, indent=2)
        
        return [TextContent(type="text", text=result_text)]
        
    except Exception as e:
        error_result = {
            "success": False,
            "message": f"도구 실행 중 오류 발생: {str(e)}"
        }
        import json
        return [TextContent(type="text", text=json.dumps(error_result, ensure_ascii=False, indent=2))]


async def main():
    """MCP 서버 실행"""
    # 사용자 인증
    print("=== BSSM Captive Portal MCP Server ===", file=sys.stderr)
    print(f"Django API: {config.DJANGO_API_URL}", file=sys.stderr)
    print("", file=sys.stderr)
    
    # 사용자 로그인
    username = input("사용자명: ")
    password = input("비밀번호: ")
    
    print("\n로그인 중...", file=sys.stderr)
    if await auth_manager.login(username, password):
        print(f"✓ 로그인 성공: {auth_manager.username}", file=sys.stderr)
        print(f"✓ 권한: {'관리자' if auth_manager.is_admin else '일반 사용자'}", file=sys.stderr)
        print("\nMCP 서버를 시작합니다...\n", file=sys.stderr)
        
        # MCP 서버 실행
        async with stdio_server() as (read_stream, write_stream):
            await app.run(read_stream, write_stream, app.create_initialization_options())
    else:
        print("✗ 로그인 실패", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
