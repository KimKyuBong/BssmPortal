"""
Admin Tools - Rental Management
관리자용 대여 관리 도구들
"""
from typing import Any, Dict, Optional, List
import sys
import os

# 상위 디렉토리를 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from utils.api_client import api
from config import config
from auth import auth_manager


async def list_rental_requests(
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    page: int = 1
) -> Dict[str, Any]:
    """
    대여/반납 요청 목록 조회 (관리자)
    
    Args:
        status: 요청 상태 (PENDING, APPROVED, REJECTED)
        request_type: 요청 유형 (RENTAL, RETURN)
        page: 페이지 번호
        
    Returns:
        요청 목록 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.ADMIN_RENTALS_URL}requests/"
    params = {"page": page}
    
    if status:
        params["status"] = status
    if request_type:
        params["request_type"] = request_type
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "대여 요청 목록을 성공적으로 조회했습니다.",
        "requests": data.get("results", []),
        "count": data.get("count", 0)
    }


async def approve_rental_request(request_id: int, notes: Optional[str] = None) -> Dict[str, Any]:
    """
    대여 요청 승인 (관리자)
    
    Args:
        request_id: 요청 ID
        notes: 승인 메모
        
    Returns:
        승인 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.ADMIN_RENTALS_URL}requests/{request_id}/approve/"
    approve_data = {}
    
    if notes:
        approve_data["notes"] = notes
    
    data = await api.post(url, json=approve_data)
    
    return {
        "success": True,
        "message": "대여 요청을 성공적으로 승인했습니다.",
        "request": data
    }


async def reject_rental_request(request_id: int, reason: str) -> Dict[str, Any]:
    """
    대여 요청 거절 (관리자)
    
    Args:
        request_id: 요청 ID
        reason: 거절 사유
        
    Returns:
        거절 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.ADMIN_RENTALS_URL}requests/{request_id}/reject/"
    data = await api.post(url, json={"reason": reason})
    
    return {
        "success": True,
        "message": "대여 요청을 거절했습니다.",
        "request": data
    }


async def list_all_rentals(
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    page: int = 1
) -> Dict[str, Any]:
    """
    전체 대여 내역 조회 (관리자)
    
    Args:
        status: 대여 상태 (RENTED, RETURNED, OVERDUE 등)
        user_id: 사용자 ID 필터
        page: 페이지 번호
        
    Returns:
        대여 내역 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = config.ADMIN_RENTALS_URL
    params = {"page": page}
    
    if status:
        params["status"] = status
    if user_id:
        params["user_id"] = user_id
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "전체 대여 내역을 성공적으로 조회했습니다.",
        "rentals": data.get("results", []),
        "count": data.get("count", 0)
    }


async def process_return(rental_id: int, condition: str = "NORMAL", notes: Optional[str] = None) -> Dict[str, Any]:
    """
    반납 처리 (관리자)
    
    Args:
        rental_id: 대여 ID
        condition: 장비 상태 (NORMAL, DAMAGED, LOST)
        notes: 반납 메모
        
    Returns:
        반납 처리 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.ADMIN_RENTALS_URL}{rental_id}/return/"
    return_data = {"condition": condition}
    
    if notes:
        return_data["notes"] = notes
    
    data = await api.post(url, json=return_data)
    
    return {
        "success": True,
        "message": "반납 처리가 완료되었습니다.",
        "rental": data
    }


async def list_all_equipment(
    equipment_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1
) -> Dict[str, Any]:
    """
    전체 장비 목록 조회 (관리자)
    
    Args:
        equipment_type: 장비 유형 (LAPTOP, MACBOOK, TABLET 등)
        status: 장비 상태 (AVAILABLE, RENTED, MAINTENANCE 등)
        page: 페이지 번호
        
    Returns:
        장비 목록 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.ADMIN_RENTALS_URL}equipment/"
    params = {"page": page}
    
    if equipment_type:
        params["equipment_type"] = equipment_type
    if status:
        params["status"] = status
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "장비 목록을 성공적으로 조회했습니다.",
        "equipment": data.get("results", []),
        "count": data.get("count", 0)
    }


async def create_equipment(
    equipment_type: str,
    model_name: str,
    serial_number: str,
    year: int,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    새 장비 등록 (관리자)
    
    Args:
        equipment_type: 장비 유형
        model_name: 모델명
        serial_number: 시리얼 번호
        year: 제조 연도
        notes: 비고
        
    Returns:
        등록 결과 딕셔너리
    """
    if not auth_manager.is_admin:
        return {
            "success": False,
            "message": "관리자 권한이 필요합니다."
        }
    
    url = f"{config.ADMIN_RENTALS_URL}equipment/"
    equipment_data = {
        "equipment_type": equipment_type,
        "model_name": model_name,
        "serial_number": serial_number,
        "year": year
    }
    
    if notes:
        equipment_data["notes"] = notes
    
    data = await api.post(url, json=equipment_data)
    
    return {
        "success": True,
        "message": f"장비 '{model_name}'을(를) 성공적으로 등록했습니다.",
        "equipment": data
    }
