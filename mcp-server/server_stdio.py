#!/usr/bin/env python3
"""
BSSM Captive Portal MCP Server v2.0
Django 백엔드와 연동하여 AI 에이전트를 통한 시스템 관리를 제공합니다.
50개 도구 지원 (방송 기능 제외)
"""
import asyncio
import sys
import os
import json
from typing import Any, Sequence

# MCP SDK
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource

# 로컬 모듈
from config import config
from auth import auth_manager

# 도구 임포트 - 일반 사용자
from tools.user.profile_tools import (
    get_my_info, change_my_password,
    list_my_devices, register_my_device, update_my_device, delete_my_device,
    list_my_rentals, view_available_equipment, request_rental, request_return
)

# 도구 임포트 - 관리자
from tools.admin.user_tools import (
    list_users, create_user, update_user, delete_user, reset_user_password
)
from tools.admin.rental_tools import (
    list_rental_requests, approve_rental_request, reject_rental_request,
    list_all_rentals, process_return, list_all_equipment, create_equipment
)
from tools.admin.device_tools import (
    list_all_devices, get_device_statistics, reassign_device_ip, toggle_device_active,
    blacklist_ip, unblacklist_ip, list_blacklisted_ips, get_device_history
)
from tools.admin.dns_tools import (
    list_dns_records, create_dns_record, delete_dns_record, apply_dns_records,
    list_ssl_certificates, generate_ssl_certificate, renew_ssl_certificate,
    revoke_ssl_certificate, get_expiring_certificates
)
from tools.admin.system_tools import (
    get_system_status, refresh_health_data, get_pihole_stats
)

# MCP 서버 인스턴스
app = Server(config.MCP_SERVER_NAME)


# 도구 매핑
TOOL_HANDLERS = {
    # 일반 사용자 도구
    "get_my_info": get_my_info,
    "change_my_password": change_my_password,
    "list_my_devices": list_my_devices,
    "register_my_device": register_my_device,
    "update_my_device": update_my_device,
    "delete_my_device": delete_my_device,
    "list_my_rentals": list_my_rentals,
    "view_available_equipment": view_available_equipment,
    "request_rental": request_rental,
    "request_return": request_return,
    
    # 관리자 도구 - 사용자 관리
    "admin_list_users": list_users,
    "admin_create_user": create_user,
    "admin_update_user": update_user,
    "admin_delete_user": delete_user,
    "admin_reset_user_password": reset_user_password,
    
    # 관리자 도구 - 대여 관리
    "admin_list_rental_requests": list_rental_requests,
    "admin_approve_rental_request": approve_rental_request,
    "admin_reject_rental_request": reject_rental_request,
    "admin_list_all_rentals": list_all_rentals,
    "admin_process_return": process_return,
    "admin_list_all_equipment": list_all_equipment,
    "admin_create_equipment": create_equipment,
    
    # 관리자 도구 - 장치(IP) 관리
    "admin_list_all_devices": list_all_devices,
    "admin_get_device_statistics": get_device_statistics,
    "admin_reassign_device_ip": reassign_device_ip,
    "admin_toggle_device_active": toggle_device_active,
    "admin_blacklist_ip": blacklist_ip,
    "admin_unblacklist_ip": unblacklist_ip,
    "admin_list_blacklisted_ips": list_blacklisted_ips,
    "admin_get_device_history": get_device_history,
    
    # 관리자 도구 - DNS/SSL 관리  
    "admin_list_dns_records": list_dns_records,
    "admin_create_dns_record": create_dns_record,
    "admin_delete_dns_record": delete_dns_record,
    "admin_apply_dns_records": apply_dns_records,
    "admin_list_ssl_certificates": list_ssl_certificates,
    "admin_generate_ssl_certificate": generate_ssl_certificate,
    "admin_renew_ssl_certificate": renew_ssl_certificate,
    "admin_revoke_ssl_certificate": revoke_ssl_certificate,
    "admin_get_expiring_certificates": get_expiring_certificates,
    
    # 관리자 도구 - 시스템 관리
    "admin_get_system_status": get_system_status,
    "admin_refresh_health_data": refresh_health_data,
    "admin_get_pihole_stats": get_pihole_stats,
}


@app.list_tools()
async def list_tools() -> list[Tool]:
    """사용 가능한 MCP 도구 목록 반환"""
    from tools_definition import get_user_tools, get_admin_tools
    
    tools = []
    
    # 일반 사용자 도구
    if auth_manager.is_authenticated:
        tools.extend(get_user_tools())
    
    # 관리자 도구
    if auth_manager.is_admin:
        tools.extend(get_admin_tools())
    
    return tools


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> Sequence[TextContent | ImageContent | EmbeddedResource]:
    """MCP 도구 실행"""
    try:
        # 도구 핸들러 찾기
        handler = TOOL_HANDLERS.get(name)
        if not handler:
            raise ValueError(f"Unknown tool: {name}")
        
        # 도구 실행
        if arguments:
            result = await handler(**arguments)
        else:
            result = await handler()
        
        # 결과를 JSON 문자열로 변환
        result_text = json.dumps(result, ensure_ascii=False, indent=2)
        return [TextContent(type="text", text=result_text)]
        
    except Exception as e:
        error_result = {
            "success": False,
            "message": f"도구 실행 중 오류 발생: {str(e)}"
        }
        return [TextContent(type="text", text=json.dumps(error_result, ensure_ascii=False, indent=2))]


async def main():
    """MCP 서버 실행"""
    print("=== BSSM Captive Portal MCP Server v2.0 ===", file=sys.stderr)
    print(f"Django API: {config.DJANGO_API_URL}", file=sys.stderr)
    print(f"총 도구: {len(TOOL_HANDLERS)}개", file=sys.stderr)
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
