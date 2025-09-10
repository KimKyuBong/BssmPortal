from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet, PasswordViewSet
from devices.views import DeviceViewSet, DeviceHistoryViewSet, get_ip_rentals, get_device_rentals
from rentals.views import EquipmentViewSet, RentalViewSet, RentalRequestViewSet
from rentals.public_views import PublicEquipmentView, PublicEquipmentStatusView
from users import auth, views as user_views

# 일반 API 라우터 설정 (사용자용)
router = DefaultRouter()
router.register(r'ip', DeviceViewSet, basename='ip')  # 일반 사용자용 IP 관리
router.register(r'ip/history', DeviceHistoryViewSet, basename='ip-history')  # 일반 사용자용 이력

# 관리자 전용 라우터 (관리자 패널용 특수 기능)
admin_router = DefaultRouter()
admin_router.register(r'users', UserViewSet)  # 관리자용 사용자 관리
admin_router.register(r'ip', DeviceViewSet, basename='admin-ip')  # 관리자용 IP 관리
admin_router.register(r'ip/history', DeviceHistoryViewSet, basename='admin-ip-history')  # 관리자용 전체 이력
admin_router.register(r'rentals', RentalViewSet, basename='admin-rentals')  # 관리자용 전체 대여 목록
admin_router.register(r'rental-requests', RentalRequestViewSet, basename='admin-rental-requests')
admin_router.register(r'equipment', EquipmentViewSet, basename='admin-equipment')  # 관리자용 장비 관리

# 관리자 전용 URL 패턴 (라우터로 처리할 수 없는 특수 기능)
admin_custom_patterns = [
    # 사용자 관리 특수 기능
    path('users/<int:pk>/reset-password/', UserViewSet.as_view({'post': 'reset_password'}), name='reset_password'),
    
    # IP 관리 특수 기능
    path('ip/all/', DeviceViewSet.as_view({'get': 'all'}), name='all-devices'),  # 관리자 전용 전체 장치 조회
    path('ip/statistics/', DeviceViewSet.as_view({'get': 'statistics'}), name='ip-statistics'),
    path('ip/<int:pk>/reassign/', DeviceViewSet.as_view({'post': 'reassign_ip'}), name='reassign-ip'),
    path('ip/<int:pk>/toggle-active/', DeviceViewSet.as_view({'post': 'toggle_active'}), name='toggle-active'),
    
    # 대여 관리 특수 기능
    path('ip-rentals/', get_ip_rentals, name='ip-rentals'),
    path('device-rentals/', get_device_rentals, name='device-rentals'),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 공개 API 엔드포인트 (인증 불필요) - nginx /api/ 프록시와 호환
    path('api/public/equipment/<str:serial_number>/', PublicEquipmentView.as_view(), name='public-equipment-detail'),
    path('api/public/equipment/<str:serial_number>/status/', PublicEquipmentStatusView.as_view(), name='public-equipment-status'),
    
    path('api/admin/', include(admin_router.urls)),  # 관리자 API 엔드포인트를 먼저
    path('api/admin/', include(admin_custom_patterns)),  # 관리자 커스텀 패턴
    path('api/', include(router.urls)),  # 일반 API 엔드포인트를 나중에
    path('api/auth/', include('users.urls')),  # 인증 관련 URL
    path('api/users/', include('users.urls')),
    path('api/ip/', include('devices.urls')),  
    path('api/system/', include('system.urls')),
    path('api/rentals/', include('rentals.urls')),  # 일반 사용자용 대여 관련 URL
    path('api/dns/', include('dns.urls')),
    path('api/broadcast/', include('broadcast.urls')),  # 방송 시스템 URL
    path('api/security/', include('api_security.urls')),  # TOTP API 키 관리 URL
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)