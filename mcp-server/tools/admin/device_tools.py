"""
Admin Tools - Device (IP) Management
관리자용 장치 및 IP 관리 도구들
"""
from typing import Any, Dict, Optional
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from utils.api_client import api
from config import config
from auth import auth_manager


async def list_all_devices(
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = 1
) -> Dict[str, Any]:
    """
    전체 장치 목록 조회 (관리자)
    
    Args:
        search: 검색어 (MAC 주소, 장치 이름)
        is_active: 활성화 상태 필터
        page: 페이지 번호
        
    Returns:
        장치 목록 딕셔너리
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/admin/ip/all/"
    params = {"page": page}
    
    if search:
        params["search"] = search
    if is_active is not None:
        params["is_active"] = is_active
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "전체 장치 목록을 성공적으로 조회했습니다.",
        "devices": data.get("results", []),
        "count": data.get("count", 0)
    }


async def get_device_statistics() -> Dict[str, Any]:
    """
    장치 통계 조회 (관리자)
    
    Returns:
        장치 통계 딕셔너리
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/admin/ip/statistics/"
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "장치 통계를 성공적으로 조회했습니다.",
        "statistics": data
    }


async def reassign_device_ip(device_id: int) -> Dict[str, Any]:
    """
    장치 IP 재할당 (관리자)
    
    Args:
        device_id: 장치 ID
        
    Returns:
        재할당 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/admin/ip/{device_id}/reassign/"
    data = await api.post(url, json={})
    
    return {
        "success": True,
        "message": "IP 주소를 성공적으로 재할당했습니다.",
        "device": data
    }


async def toggle_device_active(device_id: int) -> Dict[str, Any]:
    """
    장치 활성화/비활성화 토글 (관리자)
    
    Args:
        device_id: 장치 ID
        
    Returns:
        토글 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/admin/ip/{device_id}/toggle-active/"
    data = await api.post(url, json={})
    
    return {
        "success": True,
        "message": f"장치를 {'활성화' if data.get('is_active') else '비활성화'}했습니다.",
        "device": data
    }


async def blacklist_ip(ip_address: str, reason: Optional[str] = None) -> Dict[str, Any]:
    """
    IP 주소 블랙리스트 추가 (관리자)
    
    Args:
        ip_address: IP 주소
        reason: 블랙리스트 사유
        
    Returns:
        블랙리스트 추가 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/ip/admin/ip/blacklist/"
    blacklist_data = {"ip_address": ip_address}
    
    if reason:
        blacklist_data["reason"] = reason
    
    data = await api.post(url, json=blacklist_data)
    
    return {
        "success": True,
        "message": f"IP 주소 {ip_address}을(를) 블랙리스트에 추가했습니다.",
        "blacklist": data
    }


async def unblacklist_ip(ip_address: str) -> Dict[str, Any]:
    """
    IP 주소 블랙리스트 제거 (관리자)
    
    Args:
        ip_address: IP 주소
        
    Returns:
        블랙리스트 제거 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/ip/admin/ip/unblacklist/"
    data = await api.post(url, json={"ip_address": ip_address})
    
    return {
        "success": True,
        "message": f"IP 주소 {ip_address}을(를) 블랙리스트에서 제거했습니다.",
        "result": data
    }


async def list_blacklisted_ips() -> Dict[str, Any]:
    """
    블랙리스트된 IP 주소 목록 조회 (관리자)
    
    Returns:
        블랙리스트 IP 목록
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/ip/admin/ip/blacklist/"
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "블랙리스트 IP 목록을 성공적으로 조회했습니다.",
        "blacklisted_ips": data
    }


async def get_device_history(
    device_id: Optional[int] = None,
    action: Optional[str] = None,
    page: int = 1
) -> Dict[str, Any]:
    """
    장치 이력 조회 (관리자)
    
    Args:
        device_id: 장치 ID 필터
        action: 액션 필터 (REGISTER, UNREGISTER, REASSIGN_IP_BLACKLIST)
        page: 페이지 번호
        
    Returns:
        장치 이력 딕셔너리
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/admin/ip/history/"
    params = {"page": page}
    
    if device_id:
        params["device_id"] = device_id
    if action:
        params["action"] = action
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "장치 이력을 성공적으로 조회했습니다.",
        "history": data.get("results", []),
        "count": data.get("count", 0)
    }
