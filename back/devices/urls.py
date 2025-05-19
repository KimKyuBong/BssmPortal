from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet, DeviceHistoryViewSet

# 라우터 설정
router = DefaultRouter()
router.register(r'', DeviceViewSet, basename='device')

# 이력 라우터 설정
history_router = DefaultRouter()
history_router.register(r'', DeviceHistoryViewSet, basename='device-history')

# URL 패턴
urlpatterns = [
    # 특수 기능을 위한 URL 패턴만 여기서 정의
    path('my/', DeviceViewSet.as_view({'get': 'my'}), name='my-devices'),
    path('all/', DeviceViewSet.as_view({'get': 'all'}), name='all-devices'),
    path('statistics/', DeviceViewSet.as_view({'get': 'statistics'}), name='device-statistics'),
    path('current-mac/', DeviceViewSet.as_view({'get': 'get_current_mac'}), name='current-mac'),
    path('register-manual/', DeviceViewSet.as_view({'post': 'register_manual'}), name='register-manual'),
    
    # 개별 디바이스에 대한 작업
    path('<int:pk>/reassign-ip/', DeviceViewSet.as_view({'post': 'reassign_ip'}), name='reassign-ip'),
    path('<int:pk>/toggle-active/', DeviceViewSet.as_view({'post': 'toggle_active'}), name='toggle-active'),
    
    # 블랙리스트 관련 URL
    path('blacklist-ip/', DeviceViewSet.as_view({'post': 'blacklist_ip'}), name='blacklist-ip'),
    path('unblacklist-ip/', DeviceViewSet.as_view({'post': 'unblacklist_ip'}), name='unblacklist-ip'),
    path('blacklisted-ips/', DeviceViewSet.as_view({'get': 'blacklisted_ips'}), name='blacklisted-ips'),
    
    # 이력 관련 URL
    path('history/', include(history_router.urls)),

    
    # 라우터 URL 포함
    path('', include(router.urls)),
] 