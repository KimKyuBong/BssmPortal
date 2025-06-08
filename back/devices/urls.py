from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet

# 라우터 설정
router = DefaultRouter()
router.register(r'', DeviceViewSet, basename='device')

# URL 패턴 (일반 사용자 기능만)
urlpatterns = [
    # 사용자 기능을 위한 URL 패턴
    path('my/', DeviceViewSet.as_view({'get': 'my'}), name='my-devices'),
    path('all/', DeviceViewSet.as_view({'get': 'all'}), name='all-devices'),
    path('current-mac/', DeviceViewSet.as_view({'get': 'get_current_mac'}), name='current-mac'),
    path('register-manual/', DeviceViewSet.as_view({'post': 'register_manual'}), name='register-manual'),
    path('user/rentals/', DeviceViewSet.as_view({'get': 'user_rentals'}), name='user-rentals'),
    path('user/equipment-rentals/', DeviceViewSet.as_view({'get': 'user_equipment_rentals'}), name='user-equipment-rentals'),
    
    # 라우터 URL 포함
    path('', include(router.urls)),
] 