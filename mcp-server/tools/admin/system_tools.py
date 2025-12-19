"""
Admin Tools - System Management
관리자용 시스템 관리 도구들
"""
from typing import Any, Dict
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from utils.api_client import api
from config import config
from auth import auth_manager


async def get_system_status() -> Dict[str, Any]:
    """
    시스템 전체 상

태 조회
    
    Returns:
        시스템 상태 딕셔너리
    """
    url = f"{config.DJANGO_API_URL}/api/system/status/"
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "시스템 상태를 성공적으로 조회했습니다.",
        "status": data
    }


async def refresh_health_data() -> Dict[str, Any]:
    """
    시스템 헬스 데이터 새로고침 (관리자)
    
    Returns:
        새로고침 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/system/health/refresh/"
    data = await api.post(url, json={})
    
    return {
        "success": True,
        "message": "시스템 헬스 데이터를 성공적으로 새로고침했습니다.",
        "result": data
    }


async def get_pihole_stats() -> Dict[str, Any]:
    """
    Pi-hole 상세 통계 조회
    
    Returns:
        Pi-hole 통계
    """
    url = f"{config.DJANGO_API_URL}/api/system/pihole/stats/"
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "Pi-hole 통계를 성공적으로 조회했습니다.",
        "stats": data
    }
