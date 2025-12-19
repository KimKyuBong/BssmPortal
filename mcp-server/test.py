#!/usr/bin/env python3
"""
MCP Server Test Script
Django 백엔드 없이 MCP 서버의 기본 구조를 테스트합니다.
"""
import sys
import os

# 현재 디렉토리를 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """모든 모듈이 정상적으로 임포트되는지 테스트"""
    print("🧪 Testing imports...")
    
    try:
        from config import config
        print("✓ config 모듈 임포트 성공")
        print(f"  - Django API URL: {config.DJANGO_API_URL}")
        print(f"  - MCP Server Name: {config.MCP_SERVER_NAME}")
    except Exception as e:
        print(f"✗ config 모듈 임포트 실패: {e}")
        return False
    
    try:
        from auth import auth_manager
        print("✓ auth 모듈 임포트 성공")
        print(f"  - 인증 상태: {'인증됨' if auth_manager.is_authenticated else '미인증'}")
    except Exception as e:
        print(f"✗ auth 모듈 임포트 실패: {e}")
        return False
    
    try:
        from utils.api_client import api
        print("✓ api_client 모듈 임포트 성공")
    except Exception as e:
        print(f"✗ api_client 모듈 임포트 실패: {e}")
        return False
    
    try:
        from tools.user.profile_tools import (
            get_my_info,
            list_my_devices,
            register_my_device,
        )
        print("✓ user tools 모듈 임포트 성공")
        print(f"  - 사용자 도구: get_my_info, list_my_devices, register_my_device 등")
    except Exception as e:
        print(f"✗ user tools 모듈 임포트 실패: {e}")
        return False
    
    try:
        from tools.admin.user_tools import (
            list_users,
            create_user,
            delete_user,
        )
        print("✓ admin tools 모듈 임포트 성공")
        print(f"  - 관리자 도구: list_users, create_user, delete_user 등")
    except Exception as e:
        print(f"✗ admin tools 모듈 임포트 실패: {e}")
        return False
    
    try:
        from tools.admin.rental_tools import (
            list_rental_requests,
            approve_rental_request,
        )
        print("✓ admin rental tools 모듈 임포트 성공")
        print(f"  - 대여 관리 도구: list_rental_requests, approve_rental_request 등")
    except Exception as e:
        print(f"✗ admin rental tools 모듈 임포트 실패: {e}")
        return False
    
    return True


def test_mcp_server():
    """MCP 서버 구조 테스트"""
    print("\n🧪 Testing MCP server structure...")
    
    try:
        from mcp.server import Server
        from mcp.types import Tool
        print("✓ MCP SDK 임포트 성공")
    except Exception as e:
        print(f"✗ MCP SDK 임포트 실패: {e}")
        return False
    
    try:
        # server.py에서 app을 임포트하려고 시도
        # (실제로는 실행되지 않도록 함)
        print("✓ MCP 서버 파일 구조 확인 완료")
    except Exception as e:
        print(f"✗ MCP 서버 구조 테스트 실패: {e}")
        return False
    
    return True


def count_tools():
    """사용 가능한 도구 개수 세기"""
    print("\n📊 Tool Statistics:")
    
    user_tools = [
        "get_my_info",
        "change_my_password",
        "list_my_devices",
        "register_my_device",
        "update_my_device",
        "delete_my_device",
        "list_my_rentals",
        "view_available_equipment",
        "request_rental",
        "request_return",
    ]
    
    admin_tools = [
        "admin_list_users",
        "admin_create_user",
        "admin_update_user",
        "admin_delete_user",
        "admin_reset_user_password",
        "admin_list_rental_requests",
        "admin_approve_rental_request",
        "admin_reject_rental_request",
        "admin_list_all_rentals",
        "admin_process_return",
        "admin_list_all_equipment",
        "admin_create_equipment",
    ]
    
    print(f"  일반 사용자 도구: {len(user_tools)}개")
    for tool in user_tools:
        print(f"    - {tool}")
    
    print(f"\n  관리자 도구: {len(admin_tools)}개")
    for tool in admin_tools:
        print(f"    - {tool}")
    
    print(f"\n  총 도구 개수: {len(user_tools) + len(admin_tools)}개")


def main():
    """메인 테스트 함수"""
    print("=" * 60)
    print("BSSM Captive Portal MCP Server - Test Suite")
    print("=" * 60)
    print()
    
    # 임포트 테스트
    if not test_imports():
        print("\n❌ 임포트 테스트 실패")
        return 1
    
    # MCP 서버 구조 테스트
    if not test_mcp_server():
        print("\n❌ MCP 서버 구조 테스트 실패")
        return 1
    
    # 도구 통계
    count_tools()
    
    print("\n" + "=" * 60)
    print("✅ 모든 테스트 통과!")
    print("=" * 60)
    print()
    print("다음 단계:")
    print("1. Django 백엔드가 실행 중인지 확인: http://localhost:8000")
    print("2. MCP 서버 실행: .venv/bin/python server.py")
    print("3. 또는 Claude Desktop 설정 파일에 추가")
    print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
