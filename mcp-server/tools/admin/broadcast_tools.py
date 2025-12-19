"""
Admin Tools - Broadcast Management
관리자용 방송 관리 도구들
⚠️ 주의: 실제 방송은 테스트하지 마세요!
"""
from typing import Any, Dict, Optional, List
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from utils.api_client import api
from config import config
from auth import auth_manager


async def broadcast_text(
    text: str,
    target_rooms: Optional[List[str]] = None,
    language: str = "ko",
    auto_off: bool = False
) -> Dict[str, Any]:
    """
    텍스트 방송 송출 (관리자/교사)
    ⚠️ 주의: 테스트 시 실제 방송이 송출되므로 주의하세요!
    
    Args:
        text: 방송할 텍스트 (최대 500자)
        target_rooms: 방송할 교실 번호 목록 (예: ["315", "316"])
        language: 언어 코드 (기본값: "ko")
        auto_off: 방송 후 자동 끄기
        
    Returns:
        방송 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 또는 교사 권한이 필요합니다."}
    
    url = f"{config.BROADCAST_URL}text/"
    broadcast_data = {
        "text": text,
        "language": language,
        "auto_off": auto_off
    }
    
    if target_rooms:
        broadcast_data["target_rooms"] = target_rooms
    
    data = await api.post(url, json=broadcast_data)
    
    return {
        "success": True,
        "message": "텍스트 방송이 성공적으로 송출되었습니다.",
        "broadcast": data
    }


async def get_broadcast_status() -> Dict[str, Any]:
    """
    방송 시스템 상태 조회
    
    Returns:
        방송 시스템 상태
    """
    url = f"{config.BROADCAST_URL}status/"
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "방송 시스템 상태를 성공적으로 조회했습니다.",
        "status": data
    }


async def get_broadcast_history(limit: int = 50) -> Dict[str, Any]:
    """
    방송 이력 조회
    
    Args:
        limit: 조회할 이력 수 (기본값: 50)
        
    Returns:
        방송 이력 딕셔너리
    """
    url = f"{config.BROADCAST_URL}history/"
    params = {"limit": limit}
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "방송 이력을 성공적으로 조회했습니다.",
        "history": data.get("history", []),
        "total_count": data.get("total_count", 0)
    }


async def get_device_matrix() -> Dict[str, Any]:
    """
    방송 장치 매트릭스 조회
    
    Returns:
        장치 매트릭스 정보
    """
    url = f"{config.BROADCAST_URL}device-matrix/"
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "장치 매트릭스를 성공적으로 조회했습니다.",
        "matrix": data.get("matrix", []),
        "total_devices": data.get("total_devices", 0)
    }


async def delete_broadcast_history(history_id: int) -> Dict[str, Any]:
    """
    방송 이력 삭제 (관리자)
    
    Args:
        history_id: 방송 이력 ID
        
    Returns:
        삭제 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.BROADCAST_URL}history/{history_id}/"
    await api.delete(url)
    
    return {
        "success": True,
        "message": "방송 이력을 성공적으로 삭제했습니다."
    }
