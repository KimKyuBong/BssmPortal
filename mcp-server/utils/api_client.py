"""
Django API Client Utility
Django REST API와 통신하기 위한 헬퍼 함수들
"""
import httpx
from typing import Optional, Dict, Any, List
from config import config
from auth import auth_manager


class APIClient:
    """Django API 클라이언트"""
    
    @staticmethod
    async def request(
        method: str,
        url: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        ensure_auth: bool = True
    ) -> Dict[str, Any]:
        """
        Django API 요청 실행
        
        Args:
            method: HTTP 메서드 (GET, POST, PUT, DELETE 등)
            url: 요청 URL
            json: JSON 요청 본문
            params: 쿼리 파라미터
            files: 파일 업로드
            ensure_auth: 자동 인증 확인 여부
            
        Returns:
            응답 데이터 (dict)
            
        Raises:
            Exception: API 요청 실패 시
        """
        # 인증 확인
        if ensure_auth:
            if not await auth_manager.ensure_valid_token():
                raise Exception("인증되지 않았습니다. 로그인이 필요합니다.")
        
        headers = auth_manager.get_auth_headers()
        
        async with httpx.AsyncClient(timeout=config.DJANGO_API_TIMEOUT) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    json=json,
                    params=params,
                    files=files,
                    headers=headers
                )
                
                # 응답 확인
                if response.status_code >= 400:
                    error_msg = f"API 요청 실패 ({response.status_code})"
                    try:
                        error_data = response.json()
                        if isinstance(error_data, dict):
                            if "detail" in error_data:
                                error_msg = f"{error_msg}: {error_data['detail']}"
                            elif "message" in error_data:
                                error_msg = f"{error_msg}: {error_data['message']}"
                            else:
                                error_msg = f"{error_msg}: {error_data}"
                    except:
                        error_msg = f"{error_msg}: {response.text}"
                    
                    raise Exception(error_msg)
                
                # JSON 응답 반환
                return response.json()
                
            except httpx.TimeoutException:
                raise Exception(f"API 요청 시간 초과: {url}")
            except httpx.RequestError as e:
                raise Exception(f"API 요청 오류: {e}")
    
    @staticmethod
    async def get(url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """GET 요청"""
        return await APIClient.request("GET", url, params=params)
    
    @staticmethod
    async def post(url: str, json: Optional[Dict[str, Any]] = None, files: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """POST 요청"""
        return await APIClient.request("POST", url, json=json, files=files)
    
    @staticmethod
    async def put(url: str, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """PUT 요청"""
        return await APIClient.request("PUT", url, json=json)
    
    @staticmethod
    async def patch(url: str, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """PATCH 요청"""
        return await APIClient.request("PATCH", url, json=json)
    
    @staticmethod
    async def delete(url: str) -> Dict[str, Any]:
        """DELETE 요청"""
        return await APIClient.request("DELETE", url)


# 편의를 위한 전역 인스턴스
api = APIClient()
