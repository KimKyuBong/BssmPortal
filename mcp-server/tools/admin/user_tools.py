"""
Admin Tools - User Management
관리자용 사용자 관리 도구들
"""
from typing import Any, Dict, Optional, List
import sys
import os

# 상위 디렉토리를 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from utils.api_client import api
from config import config
from auth import auth_manager


async def list_users(
    search: Optional[str] = None,
    is_staff: Optional[bool] = None,
    page: int = 1,
    page_size: int = 50
) -> Dict[str, Any]:
    """
    사용자 목록 조회 (관리자)
    
    Args:
        search: 검색어 (사용자명, 이메일, 이름)
        is_staff: 관리자 필터
        page: 페이지 번호
        page_size: 페이지 크기
        
    Returns:
        사용자 목록 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.DJANGO_API_URL}/api/admin/users/"
    params = {"page": page, "page_size": page_size}
    
    if search:
        params["search"] = search
    if is_staff is not None:
        params["is_staff"] = is_staff
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "사용자 목록을 성공적으로 조회했습니다.",
        "users": data.get("results", []),
        "count": data.get("count", 0),
        "next": data.get("next"),
        "previous": data.get("previous")
    }


async def create_user(
    username: str,
    password: str,
    email: str,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    is_staff: bool = False
) -> Dict[str, Any]:
    """
    새 사용자 생성 (관리자)
    
    Args:
        username: 사용자명
        password: 비밀번호
        email: 이메일
        first_name: 이름
        last_name: 성
        is_staff: 관리자 여부
        
    Returns:
        생성 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.DJANGO_API_URL}/api/admin/users/"
    user_data = {
        "username": username,
        "password": password,
        "email": email,
        "is_staff": is_staff
    }
    
    if first_name:
        user_data["first_name"] = first_name
    if last_name:
        user_data["last_name"] = last_name
    
    data = await api.post(url, json=user_data)
    
    return {
        "success": True,
        "message": f"사용자 '{username}'을(를) 성공적으로 생성했습니다.",
        "user": data
    }


async def update_user(
    user_id: int,
    email: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    is_staff: Optional[bool] = None,
    is_active: Optional[bool] = None
) -> Dict[str, Any]:
    """
    사용자 정보 수정 (관리자)
    
    Args:
        user_id: 사용자 ID
        email: 이메일
        first_name: 이름
        last_name: 성
        is_staff: 관리자 여부
        is_active: 활성화 여부
        
    Returns:
        수정 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.DJANGO_API_URL}/api/admin/users/{user_id}/"
    update_data = {}
    
    if email is not None:
        update_data["email"] = email
    if first_name is not None:
        update_data["first_name"] = first_name
    if last_name is not None:
        update_data["last_name"] = last_name
    if is_staff is not None:
        update_data["is_staff"] = is_staff
    if is_active is not None:
        update_data["is_active"] = is_active
    
    data = await api.patch(url, json=update_data)
    
    return {
        "success": True,
        "message": "사용자 정보를 성공적으로 수정했습니다.",
        "user": data
    }


async def delete_user(user_id: int) -> Dict[str, Any]:
    """
    사용자 삭제 (관리자)
    
    Args:
        user_id: 사용자 ID
        
    Returns:
        삭제 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.DJANGO_API_URL}/api/admin/users/{user_id}/"
    await api.delete(url)
    
    return {
        "success": True,
        "message": "사용자를 성공적으로 삭제했습니다."
    }


async def reset_user_password(user_id: int, new_password: str) -> Dict[str, Any]:
    """
    사용자 비밀번호 초기화 (관리자)
    
    Args:
        user_id: 사용자 ID
        new_password: 새 비밀번호
        
    Returns:
        초기화 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.DJANGO_API_URL}/api/admin/users/{user_id}/reset_password/"
    data = await api.post(url, json={"new_password": new_password})
    
    return {
        "success": True,
        "message": "사용자 비밀번호를 성공적으로 초기화했습니다.",
        "data": data
    }
