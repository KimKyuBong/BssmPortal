#!/usr/bin/env python3
"""
BSSM Captive Portal MCP Server - HTTP JSON-RPC Mode
Claude Desktop "remote" 타입 완벽 지원
"""
import asyncio
import sys
import os
import json
from typing import Any, Dict, List, Optional

# Starlette for HTTP server
from starlette.applications import Starlette
from starlette.routing import Route
from starlette.responses import JSONResponse
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
import uvicorn

# 로컬 모듈
from config import config
from auth import auth_manager
from tools_definition import get_user_tools, get_admin_tools

# 도구 핸들러 임포트  
from tools.user.profile_tools import *
from tools.admin.user_tools import *
from tools.admin.rental_tools import *
from tools.admin.device_tools import *
from tools.admin.dns_tools import *
from tools.admin.system_tools import *

# 도구 핸들러 매핑
TOOL_HANDLERS = {
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
    "admin_list_users": list_users,
    "admin_create_user": create_user,
    "admin_update_user": update_user,
    "admin_delete_user": delete_user,
    "admin_reset_user_password": reset_user_password,
    "admin_list_rental_requests": list_rental_requests,
    "admin_approve_rental_request": approve_rental_request,
    "admin_reject_rental_request": reject_rental_request,
    "admin_list_all_rentals": list_all_rentals,
    "admin_process_return": process_return,
    "admin_list_all_equipment": list_all_equipment,
    "admin_create_equipment": create_equipment,
    "admin_list_all_devices": list_all_devices,
    "admin_get_device_statistics": get_device_statistics,
    "admin_reassign_device_ip": reassign_device_ip,
    "admin_toggle_device_active": toggle_device_active,
    "admin_blacklist_ip": blacklist_ip,
    "admin_unblacklist_ip": unblacklist_ip,
    "admin_list_blacklisted_ips": list_blacklisted_ips,
    "admin_get_device_history": get_device_history,
    "admin_list_dns_records": list_dns_records,
    "admin_create_dns_record": create_dns_record,
    "admin_delete_dns_record": delete_dns_record,
    "admin_apply_dns_records": apply_dns_records,
    "admin_list_ssl_certificates": list_ssl_certificates,
    "admin_generate_ssl_certificate": generate_ssl_certificate,
    "admin_renew_ssl_certificate": renew_ssl_certificate,
    "admin_revoke_ssl_certificate": revoke_ssl_certificate,
    "admin_get_expiring_certificates": get_expiring_certificates,
    "admin_get_system_status": get_system_status,
    "admin_refresh_health_data": refresh_health_data,
    "admin_get_pihole_stats": get_pihole_stats,
}


def verify_api_key(api_key: Optional[str]) -> bool:
    """API 키 검증"""
    env_api_key = os.getenv("MCP_API_KEY", "")
    if not env_api_key:
        return True  # 개발 모드
    return api_key == env_api_key


async def api_key_middleware(request: Request, call_next):
    """API 키 검증 미들웨어"""
    if request.url.path == "/health":
        return await call_next(request)
    
    # API 키 확인
    api_key = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        api_key = auth_header[7:]
    if not api_key:
        api_key = request.headers.get("X-API-Key")
    if not api_key:
        api_key = request.query_params.get("api_key")
    
    if not verify_api_key(api_key):
        return JSONResponse(
            {"jsonrpc": "2.0", "error": {"code": -32000, "message": "Unauthorized"}, "id": None},
            status_code=401
        )
    
    return await call_next(request)


# JSON-RPC 핸들러
async def handle_jsonrpc(request: Request):
    """JSON-RPC 2.0 요청 처리"""
    try:
        body = await request.json()
    except:
        return JSONResponse({
            "jsonrpc": "2.0",
            "error": {"code": -32700, "message": "Parse error"},
            "id": None
        })
    
    method = body.get("method")
    params = body.get("params", {})
    request_id = body.get("id")
    
    # MCP 프로토콜 메서드 처리
    if method == "initialize":
        return JSONResponse({
            "jsonrpc": "2.0",
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {},
                },
                "serverInfo": {
                    "name": config.MCP_SERVER_NAME,
                    "version": config.MCP_SERVER_VERSION
                }
            },
            "id": request_id
        })
    
    elif method == "tools/list":
        tools = []
        if auth_manager.is_authenticated:
            tools.extend(get_user_tools())
        if auth_manager.is_admin:
            tools.extend(get_admin_tools())
        
        # Tool 객체를 dict로 변환
        tools_dict = [
            {
                "name": tool.name,
                "description": tool.description,
                "inputSchema": tool.inputSchema
            }
            for tool in tools
        ]
        
        return JSONResponse({
            "jsonrpc": "2.0",
            "result": {"tools": tools_dict},
            "id": request_id
        })
    
    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        handler = TOOL_HANDLERS.get(tool_name)
        if not handler:
            return JSONResponse({
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": f"Tool not found: {tool_name}"},
                "id": request_id
            })
        
        try:
            result = await handler(**arguments)
            return JSONResponse({
                "jsonrpc": "2.0",
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result, ensure_ascii=False, indent=2)
                        }
                    ]
                },
                "id": request_id
            })
        except Exception as e:
            return JSONResponse({
                "jsonrpc": "2.0",
                "error": {"code": -32603, "message": str(e)},
                "id": request_id
            })
    
    else:
        return JSONResponse({
            "jsonrpc": "2.0",
            "error": {"code": -32601, "message": f"Method not found: {method}"},
            "id": request_id
        })


# 헬스체크
async def health(request: Request):
    """헬스체크"""
    return JSONResponse({
        "status": "healthy",
        "server": config.MCP_SERVER_NAME,
        "version": config.MCP_SERVER_VERSION,
        "authenticated": auth_manager.is_authenticated,
        "user": auth_manager.username if auth_manager.is_authenticated else None,
        "is_admin": auth_manager.is_admin,
        "tools": len(TOOL_HANDLERS)
    })


# Starlette 앱
app = Starlette(
    routes=[
        Route("/mcp", endpoint=handle_jsonrpc, methods=["POST"]),
        Route("/health", endpoint=health),
    ],
    middleware=[
        Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]),
    ]
)

@app.middleware("http")
async def add_api_key_check(request, call_next):
    return await api_key_middleware(request, call_next)


async def main():
    """HTTP JSON-RPC 서버 실행"""
    print("=== BSSM Captive Portal MCP Server (HTTP JSON-RPC) ===", file=sys.stderr)
    print(f"Django API: {config.DJANGO_API_URL}", file=sys.stderr)
    print(f"총 도구: {len(TOOL_HANDLERS)}개", file=sys.stderr)
    print("", file=sys.stderr)
    
    # 환경 변수에서 인증 정보 가져오기
    username = os.getenv("MCP_USERNAME")
    password = os.getenv("MCP_PASSWORD")
    
    if not username:
        username = input("사용자명: ")
    if not password:
        password = input("비밀번호: ")
    
    print("\n로그인 중...", file=sys.stderr)
    if await auth_manager.login(username, password):
        print(f"✓ 로그인 성공: {auth_manager.username}", file=sys.stderr)
        print(f"✓ 권한: {'관리자' if auth_manager.is_admin else '일반 사용자'}", file=sys.stderr)
        print("\nHTTP JSON-RPC 서버를 시작합니다...", file=sys.stderr)
        print("URL: http://0.0.0.0:3000/mcp", file=sys.stderr)
        print("Health Check: http://0.0.0.0:3000/health\n", file=sys.stderr)
        
        config_uvicorn = uvicorn.Config(
            app,
            host="0.0.0.0",
            port=3000,
            log_level="info"
        )
        server = uvicorn.Server(config_uvicorn)
        await server.serve()
    else:
        print("✗ 로그인 실패", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
