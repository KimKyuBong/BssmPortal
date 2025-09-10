from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RentalViewSet, RentalRequestViewSet, EquipmentMacAddressViewSet, EquipmentReadOnlyViewSet

# 기본 라우터 구성 - 모든 기능 통합
router = DefaultRouter()
router.register(r'equipment', EquipmentReadOnlyViewSet, basename='equipment')  # 사용자용 읽기 전용 (기본 경로)
router.register(r'items', RentalViewSet)
router.register(r'requests', RentalRequestViewSet)
router.register(r'equipment-mac', EquipmentMacAddressViewSet)

urlpatterns = [
    # 비로그인 장치 상태 보고 (POST 허용) - 라우터보다 먼저 구체 경로 매핑
    path('equipment/report-status/', EquipmentReadOnlyViewSet.as_view({'post': 'report_status'}), name='equipment-report-status'),
    
    # 기본 라우터 (모든 기능)
    path('', include(router.urls)),
] 