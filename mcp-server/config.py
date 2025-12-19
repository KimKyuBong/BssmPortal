"""
MCP Server Configuration
Django 백엔드와 연동하기 위한 설정 관리
"""
import os
from typing import Optional
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()


class Config:
    """MCP 서버 설정"""
    
    # Django Backend
    DJANGO_API_URL: str = os.getenv("DJANGO_API_URL", "http://localhost:8000")
    DJANGO_API_TIMEOUT: int = int(os.getenv("DJANGO_API_TIMEOUT", "30"))
    
    # MCP Server
    MCP_SERVER_NAME: str = os.getenv("MCP_SERVER_NAME", "bssm-captive-mcp")
    MCP_SERVER_VERSION: str = os.getenv("MCP_SERVER_VERSION", "1.0.0")
    
    # Authentication
    JWT_TOKEN: Optional[str] = os.getenv("JWT_TOKEN", None)
    
    # API Endpoints
    @property
    def AUTH_LOGIN_URL(self) -> str:
        return f"{self.DJANGO_API_URL}/api/auth/login/"
    
    @property
    def AUTH_REFRESH_URL(self) -> str:
        return f"{self.DJANGO_API_URL}/api/auth/refresh/"
    
    @property
    def USERS_URL(self) -> str:
        return f"{self.DJANGO_API_URL}/api/users/"
    
    @property
    def DEVICES_URL(self) -> str:
        return f"{self.DJANGO_API_URL}/api/devices/"
    
    @property
    def RENTALS_URL(self) -> str:
        return f"{self.DJANGO_API_URL}/api/rentals/"
    
    @property
    def ADMIN_RENTALS_URL(self) -> str:
        return f"{self.DJANGO_API_URL}/api/admin/rentals/"
    
    @property
    def BROADCAST_URL(self) -> str:
        return f"{self.DJANGO_API_URL}/api/broadcast/"


# 전역 설정 인스턴스
config = Config()
