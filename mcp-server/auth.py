"""
Authentication Module
Django JWT 토큰 관리 및 인증 처리
"""
import jwt
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from config import config


class AuthManager:
    """Django JWT 인증 관리자"""
    
    def __init__(self):
        self.access_token: Optional[str] = config.JWT_TOKEN
        self.refresh_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        self.user_info: Optional[Dict[str, Any]] = None
    
    async def login(self, username: str, password: str) -> bool:
        """
        Django 백엔드에 로그인하여 JWT 토큰 획득
        
        Args:
            username: 사용자명
            password: 비밀번호
            
        Returns:
            성공 여부
        """
        async with httpx.AsyncClient(timeout=config.DJANGO_API_TIMEOUT) as client:
            try:
                response = await client.post(
                    config.AUTH_LOGIN_URL,
                    json={"username": username, "password": password}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.access_token = data.get("access")
                    self.refresh_token = data.get("refresh")
                    self.user_info = data.get("user", {})
                    
                    # 토큰 만료 시간 계산 (대략 1시간)
                    self.token_expiry = datetime.now() + timedelta(hours=1)
                    
                    return True
                else:
                    print(f"로그인 실패: {response.status_code} - {response.text}")
                    return False
                    
            except Exception as e:
                print(f"로그인 오류: {e}")
                return False
    
    async def refresh_access_token(self) -> bool:
        """
        Refresh 토큰으로 Access 토큰 갱신
        
        Returns:
            성공 여부
        """
        if not self.refresh_token:
            return False
        
        async with httpx.AsyncClient(timeout=config.DJANGO_API_TIMEOUT) as client:
            try:
                response = await client.post(
                    config.AUTH_REFRESH_URL,
                    json={"refresh": self.refresh_token}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.access_token = data.get("access")
                    self.token_expiry = datetime.now() + timedelta(hours=1)
                    return True
                else:
                    return False
                    
            except Exception as e:
                print(f"토큰 갱신 오류: {e}")
                return False
    
    async def ensure_valid_token(self) -> bool:
        """
        유효한 토큰이 있는지 확인하고, 필요시 갱신
        
        Returns:
            유효한 토큰 보유 여부
        """
        # 토큰이 없으면 실패
        if not self.access_token:
            return False
        
        # 토큰 만료 5분 전에 갱신
        if self.token_expiry and datetime.now() >= self.token_expiry - timedelta(minutes=5):
            return await self.refresh_access_token()
        
        return True
    
    def get_auth_headers(self) -> Dict[str, str]:
        """
        API 요청용 인증 헤더 반환
        
        Returns:
            Authorization 헤더 딕셔너리
        """
        if not self.access_token:
            return {}
        
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    @property
    def is_authenticated(self) -> bool:
        """인증 여부 확인"""
        return self.access_token is not None
    
    @property
    def is_admin(self) -> bool:
        """관리자 여부 확인"""
        if not self.user_info:
            return False
        return self.user_info.get("is_staff", False)
    
    @property
    def username(self) -> Optional[str]:
        """사용자명 반환"""
        if not self.user_info:
            return None
        return self.user_info.get("username")


# 전역 인증 관리자 인스턴스
auth_manager = AuthManager()
