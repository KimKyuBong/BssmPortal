from django.urls import path
from .views import DeviceViewSet

# URL 패턴 (일반 사용자 기능만)
urlpatterns = [
    # 특정 액션들을 먼저 정의 (더 구체적인 패턴)
    path('register-manual/', DeviceViewSet.as_view({'post': 'register_manual'}), name='register-manual'),
    path('current-mac/', DeviceViewSet.as_view({'get': 'get_current_mac'}), name='current-mac'),
    path('my/', DeviceViewSet.as_view({'get': 'my'}), name='my-devices'),
    path('user/rentals/', DeviceViewSet.as_view({'get': 'user_rentals'}), name='user-rentals'),
    path('user/equipment-rentals/', DeviceViewSet.as_view({'get': 'user_equipment_rentals'}), name='user-equipment-rentals'),
    
    # 블랙리스트 관련 URL 패턴 (관리자 전용)
    path('admin/ip/blacklist/', DeviceViewSet.as_view({'post': 'blacklist_ip', 'get': 'blacklisted_ips'}), name='blacklist-ip'),
    path('admin/ip/unblacklist/', DeviceViewSet.as_view({'post': 'unblacklist_ip'}), name='unblacklist-ip'),
    
    # 기본 CRUD 작업용 URL 패턴 (마지막에 배치)
    path('', DeviceViewSet.as_view({'get': 'list', 'post': 'create'}), name='device-list'),
    path('<int:pk>/', DeviceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='device-detail'),
] 