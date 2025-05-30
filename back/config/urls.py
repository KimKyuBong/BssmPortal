from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet, IsSuperUser, PasswordViewSet
from devices.views import DeviceViewSet, DeviceHistoryViewSet
from rentals.views import EquipmentViewSet, RentalViewSet, RentalRequestViewSet
from users import auth, views as user_views

# 일반 API 라우터 설정 (사용자용)
router = DefaultRouter()
router.register(r'ip', DeviceViewSet, basename='ip')  # device를 ip로 변경
router.register(r'ip/history', DeviceHistoryViewSet, basename='ip-history')  # 일반 사용자용 이력

# 관리자 전용 라우터 (관리자 패널용 특수 기능)
admin_router = DefaultRouter()
admin_router.register(r'users', UserViewSet)  # 관리자용 사용자 관리
admin_router.register(r'ip', DeviceViewSet, basename='admin-ip')  # device를 ip로 변경
admin_router.register(r'ip/history', DeviceHistoryViewSet, basename='admin-ip-history')  # 관리자용 전체 이력
admin_router.register(r'rentals', RentalViewSet, basename='admin-rentals')  # 관리자용 전체 대여 목록
admin_router.register(r'rental-requests', RentalRequestViewSet, basename='admin-rental-requests')

# 관리자 전용 URL 패턴 (라우터로 처리할 수 없는 특수 기능)
admin_custom_patterns = [
    # 사용자 관리 특수 기능
    path('users/<int:pk>/reset-password/', UserViewSet.as_view({'post': 'reset'}), name='reset_password'),
    
    # IP 관리 특수 기능
    path('ip/statistics/', DeviceViewSet.as_view({'get': 'statistics'}), name='ip-statistics'),
    path('ip/<int:pk>/reassign/', DeviceViewSet.as_view({'post': 'reassign_ip'}), name='reassign-ip'),
    path('ip/<int:pk>/toggle-active/', DeviceViewSet.as_view({'post': 'toggle_active'}), name='toggle-active'),
    path('ip/blacklist/', DeviceViewSet.as_view({'post': 'blacklist_ip'}), name='blacklist-ip'),
    path('ip/unblacklist/', DeviceViewSet.as_view({'post': 'unblacklist_ip'}), name='unblacklist-ip'),
    path('ip/blacklisted/', DeviceViewSet.as_view({'get': 'blacklisted_ips'}), name='blacklisted-ips'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/admin/', include(admin_router.urls)),  # 관리자 API 엔드포인트
    path('api/auth/', include('users.urls')),  # 인증 관련 URL
    path('api/users/', include('users.urls')),
    path('api/ip/', include('devices.urls')),  # device를 ip로 변경
    path('api/system/', include('system.urls')),
    path('api/rentals/', include('rentals.urls')),  # 일반 사용자용 대여 관련 URL
    path('api/admin/', include(admin_custom_patterns)),  # 특수 기능
]