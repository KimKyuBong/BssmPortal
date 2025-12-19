"""
Admin Tools - DNS and SSL Management
관리자용 DNS 및 SSL 인증서 관리 도구들
"""
from typing import Any, Dict, Optional, List
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from utils.api_client import api
from config import config
from auth import auth_manager


async def list_dns_records() -> Dict[str, Any]:
    """
    DNS 레코드 목록 조회
    
    Returns:
        DNS 레코드 목록
    """
    url = f"{config.DJANGO_API_URL}/api/dns/records/"
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "DNS 레코드 목록을 성공적으로 조회했습니다.",
        "records": data
    }


async def create_dns_record(
    domain: str,
    record_type: str,
    value: str,
    ttl: int = 3600
) -> Dict[str, Any]:
    """
    DNS 레코드 생성 (관리자)
    
    Args:
        domain: 도메인 이름
        record_type: 레코드 타입 (A, AAAA, CNAME, MX, TXT 등)
        value: 레코드 값
        ttl: TTL (Time To Live)
        
    Returns:
        생성 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/dns/records/create/"
    record_data = {
        "domain": domain,
        "record_type": record_type,
        "value": value,
        "ttl": ttl
    }
    
    data = await api.post(url, json=record_data)
    
    return {
        "success": True,
        "message": f"DNS 레코드 '{domain}'을(를) 성공적으로 생성했습니다.",
        "record": data
    }


async def delete_dns_record(record_id: int) -> Dict[str, Any]:
    """
    DNS 레코드 삭제 (관리자)
    
    Args:
        record_id: 레코드 ID
        
    Returns:
        삭제 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/dns/records/{record_id}/delete/"
    await api.delete(url)
    
    return {
        "success": True,
        "message": "DNS 레코드를 성공적으로 삭제했습니다."
    }


async def apply_dns_records() -> Dict[str, Any]:
    """
    DNS 레코드 변경사항 적용 (관리자)
    
    Returns:
        적용 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/dns/apply/"
    data = await api.post(url, json={})
    
    return {
        "success": True,
        "message": "DNS 레코드 변경사항을 성공적으로 적용했습니다.",
        "result": data
    }


async def list_ssl_certificates() -> Dict[str, Any]:
    """
    SSL 인증서 목록 조회
    
    Returns:
        SSL 인증서 목록
    """
    url = f"{config.DJANGO_API_URL}/api/dns/ssl/certificates/"
    data = await api.get(url)
    
    return {
        "success": True,
        "message": "SSL 인증서 목록을 성공적으로 조회했습니다.",
        "certificates": data
    }


async def generate_ssl_certificate(
    domain: str,
    alternative_names: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    SSL 인증서 생성 (관리자)
    
    Args:
        domain: 도메인 이름
        alternative_names: 대체 도메인 이름 목록 (SAN)
        
    Returns:
        생성 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/dns/ssl/certificates/generate/"
    cert_data = {"domain": domain}
    
    if alternative_names:
        cert_data["alternative_names"] = alternative_names
    
    data = await api.post(url, json=cert_data)
    
    return {
        "success": True,
        "message": f"SSL 인증서 '{domain}'을(를) 성공적으로 생성했습니다.",
        "certificate": data
    }


async def renew_ssl_certificate(certificate_id: int) -> Dict[str, Any]:
    """
    SSL 인증서 갱신 (관리자)
    
    Args:
        certificate_id: 인증서 ID
        
    Returns:
        갱신 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/dns/ssl/certificates/{certificate_id}/renew/"
    data = await api.post(url, json={})
    
    return {
        "success": True,
        "message": "SSL 인증서를 성공적으로 갱신했습니다.",
        "certificate": data
    }


async def revoke_ssl_certificate(certificate_id: int, reason: str) -> Dict[str, Any]:
    """
    SSL 인증서 폐기 (관리자)
    
    Args:
        certificate_id: 인증서 ID
        reason: 폐기 사유
        
    Returns:
        폐기 결과
    """
    if not auth_manager.is_admin:
        return {"success": False, "message": "관리자 권한이 필요합니다."}
    
    url = f"{config.DJANGO_API_URL}/api/dns/ssl/certificates/{certificate_id}/revoke/"
    data = await api.post(url, json={"reason": reason})
    
    return {
        "success": True,
        "message": "SSL 인증서를 성공적으로 폐기했습니다.",
        "result": data
    }


async def get_expiring_certificates(days: int = 30) -> Dict[str, Any]:
    """
    만료 예정 SSL 인증서 조회
    
    Args:
        days: 조회 기간 (일)
        
    Returns:
        만료 예정 인증서 목록
    """
    url = f"{config.DJANGO_API_URL}/api/dns/ssl/certificates/expiring/"
    params = {"days": days}
    
    data = await api.get(url, params=params)
    
    return {
        "success": True,
        "message": f"{days}일 이내 만료 예정 인증서를 조회했습니다.",
        "certificates": data
    }
