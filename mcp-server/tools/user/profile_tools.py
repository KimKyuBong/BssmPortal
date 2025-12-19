"""
User Tools
일반 사용자용 MCP 도구들
"""
from typing import Any, Dict, Optional
import sys
import os

# 상위 디렉토리를 경로에 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from utils.api_client import api
from config import config
from auth import auth_manager


async def get_my_info() -> Dict[str, Any]:
    """
    현재 로그인한 사용자의 정보 조회
    
    Returns:
        사용자 정보 딕셔너리
    """
    url = f"{config.USERS_URL}me/"
    data = await api.get(url)
    return {
        "success": True,
        "message": "내 정보를 성공적으로 조회했습니다.",
        "user": data
    }


async def change_my_password(current_password: str, new_password: str, confirm_password: str) -> Dict[str, Any]:
    """
    비밀번호 변경
    
    Args:
        current_password: 현재 비밀번호
        new_password: 새 비밀번호
        confirm_password: 새 비밀번호 확인
        
    Returns:
        결과 딕셔너리
    """
    if new_password != confirm_password:
        return {
            "success": False,
            "message": "새 비밀번호가 일치하지 않습니다."
        }
    
    url = f"{config.DJANGO_API_URL}/api/passwords/change/"
    data = await api.post(url, json={
        "current_password": current_password,
        "new_password": new_password,
        "confirm_password": confirm_password
    })
    
    return {
        "success": True,
        "message": "비밀번호를 성공적으로 변경했습니다.",
        "data": data
    }


async def list_my_devices() -> Dict[str, Any]:
    """
    내 장치 목록 조회
    
    Returns:
        장치 목록 딕셔너리
    """
    url = config.DEVICES_URL
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "내 장치 목록을 성공적으로 조회했습니다.",
        "devices": data.get("results", []) if isinstance(data, dict) else data,
        "count": data.get("count", len(data)) if isinstance(data, dict) else len(data)
    }


async def register_my_device(mac_address: str, device_name: str) -> Dict[str, Any]:
    """
    새 장치 등록
    
    Args:
        mac_address: MAC 주소 (형식: AA:BB:CC:DD:EE:FF)
        device_name: 장치 이름
        
    Returns:
        등록 결과 딕셔너리
    """
    url = config.DEVICES_URL
    data = await api.post(url, json={
        "mac_address": mac_address,
        "device_name": device_name
    })
    
    return {
        "success": True,
        "message": f"장치 '{device_name}'을(를) 성공적으로 등록했습니다.",
        "device": data
    }


async def update_my_device(device_id: int, device_name: Optional[str] = None) -> Dict[str, Any]:
    """
    내 장치 정보 수정
    
    Args:
        device_id: 장치 ID
        device_name: 새 장치 이름 (선택)
        
    Returns:
        수정 결과 딕셔너리
    """
    url = f"{config.DEVICES_URL}{device_id}/"
    update_data = {}
    
    if device_name:
        update_data["device_name"] = device_name
    
    data = await api.patch(url, json=update_data)
    
    return {
        "success": True,
        "message": "장치 정보를 성공적으로 수정했습니다.",
        "device": data
    }


async def delete_my_device(device_id: int) -> Dict[str, Any]:
    """
    내 장치 삭제
    
    Args:
        device_id: 장치 ID
        
    Returns:
        삭제 결과 딕셔너리
    """
    url = f"{config.DEVICES_URL}{device_id}/"
    await api.delete(url)
    
    return {
        "success": True,
        "message": "장치를 성공적으로 삭제했습니다."
    }


async def list_my_rentals(status: Optional[str] = None) -> Dict[str, Any]:
    """
    내 대여 내역 조회
    
    Args:
        status: 대여 상태 필터 (RENTED, RETURNED, OVERDUE 등)
        
    Returns:
        대여 내역 딕셔너리
    """
    url = config.RENTALS_URL
    params = {}
    if status:
        params["status"] = status
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "내 대여 내역을 성공적으로 조회했습니다.",
        "rentals": data.get("results", []) if isinstance(data, dict) else data,
        "count": data.get("count", len(data)) if isinstance(data, dict) else len(data)
    }


async def view_available_equipment(equipment_type: Optional[str] = None) -> Dict[str, Any]:
    """
    대여 가능한 장비 조회
    
    Args:
        equipment_type: 장비 유형 (LAPTOP, MACBOOK, TABLET 등)
        
    Returns:
        사용 가능한 장비 목록
    """
    url = f"{config.RENTALS_URL}equipment/"
    params = {"status": "AVAILABLE"}
    
    if equipment_type:
        params["equipment_type"] = equipment_type
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": "대여 가능한 장비 목록을 성공적으로 조회했습니다.",
        "equipment": data.get("results", []) if isinstance(data, dict) else data,
        "count": data.get("count", len(data)) if isinstance(data, dict) else len(data)
    }


async def request_rental(equipment_id: int, notes: Optional[str] = None) -> Dict[str, Any]:
    """
    장비 대여 신청
    
    Args:
        equipment_id: 장비 ID
        notes: 비고 (선택)
        
    Returns:
        대여 신청 결과
    """
    url = f"{config.RENTALS_URL}requests/"
    request_data = {
        "equipment_id": equipment_id,
        "request_type": "RENTAL"
    }
    
    if notes:
        request_data["notes"] = notes
    
    data = await api.post(url, json=request_data)
    
    return {
        "success": True,
        "message": "대여 신청이 성공적으로 제출되었습니다. 관리자 승인을 기다려주세요.",
        "request": data
    }


async def request_return(rental_id: int, notes: Optional[str] = None) -> Dict[str, Any]:
    """
    장비 반납 신청
    
    Args:
        rental_id: 대여 ID
        notes: 비고 (선택)
        
    Returns:
        반납 신청 결과
    """
    url = f"{config.RENTALS_URL}requests/"
    request_data = {
        "rental_id": rental_id,
        "request_type": "RETURN"
    }
    
    if notes:
        request_data["notes"] = notes
    
    data = await api.post(url, json=request_data)
    
    return {
        "success": True,
        "message": "반납 신청이 성공적으로 제출되었습니다.",
        "request": data
    }
