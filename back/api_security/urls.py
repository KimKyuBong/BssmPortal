from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TOTPAPIKeyViewSet, TOTPVerificationView, SecurityPolicyViewSet, APIKeyUsageLogViewSet
)

# API 키 관리 라우터
router = DefaultRouter()
router.register(r'api-keys', TOTPAPIKeyViewSet, basename='api-keys')
router.register(r'policies', SecurityPolicyViewSet, basename='policies')
router.register(r'usage-logs', APIKeyUsageLogViewSet, basename='usage-logs')

urlpatterns = [
    # 라우터 URL
    path('', include(router.urls)),
    
    # TOTP 검증 엔드포인트
    path('verify/', TOTPVerificationView.as_view(), name='totp-verify'),
] 