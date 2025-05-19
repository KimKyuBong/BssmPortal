from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet, IsSuperUser, PasswordViewSet
from devices.views import DeviceViewSet, DeviceHistoryViewSet
from rentals.views import EquipmentViewSet, RentalViewSet, RentalRequestViewSet
from users import auth, views as user_views

# 일반 API 라우터 설정 (사용자용)
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'devices', DeviceViewSet, basename='device')
# RentalViewSet은 자체 권한 체크로 관리자/일반 사용자 액션 구분

# 관리자 전용 라우터 (관리자 패널용 특수 기능)
admin_router = DefaultRouter()
admin_router.register(r'users', UserViewSet)
admin_router.register(r'devices/history', DeviceHistoryViewSet, basename='device-history')
# 관리자 라우터에서 Equipment 경로 제거
# admin_router.register(r'equipment', EquipmentViewSet, basename='admin-equipment')
admin_router.register(r'rentals', RentalViewSet, basename='admin-rentals')  # 관리자용 전체 대여 목록
admin_router.register(r'rental-requests', RentalRequestViewSet, basename='admin-rental-requests')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 1. 개별 API 엔드포인트 먼저 등록
    path('api/auth/login/', auth.login, name='login'),
    path('api/auth/refresh/', auth.refresh_token, name='refresh_token'),
    
    # 2. 기본 라우터 URL 패턴 - 기본 CRUD 작업을 위해 높은 우선순위 부여
    path('api/', include(router.urls)),
    
    # 3. 앱별 사용자 정의 URL 패턴 등록
    path('api/users/', include('users.urls')),
    path('api/devices/', include('devices.urls')),
    path('api/system/', include('system.urls')),
    path('api/rentals/', include('rentals.urls')),  # 일반 사용자용 대여 관련 URL
    
    # 4. 관리자 라우터 URL 패턴 등록
    path('api/admin/', include(admin_router.urls)),
]