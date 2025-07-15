from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RentalViewSet, RentalRequestViewSet, EquipmentMacAddressViewSet, EquipmentReadOnlyViewSet, EquipmentViewSet

# 일반 라우터 구성 - 사용자용 기능만 등록
router = DefaultRouter()
router.register(r'equipment', EquipmentReadOnlyViewSet, basename='equipment')  # 사용자용 장비 조회
router.register(r'items', RentalViewSet)
router.register(r'requests', RentalRequestViewSet)
router.register(r'equipment-mac', EquipmentMacAddressViewSet)

# 관리자용 장비 관리 라우터 (별도 URL 패턴으로 분리)
admin_router = DefaultRouter()
admin_router.register(r'equipment', EquipmentViewSet, basename='admin-equipment')  # 관리자용 장비 관리

urlpatterns = [
    # 라우터에 등록된 모든 URL 포함
    path('', include(router.urls)),
    # 관리자용 장비 관리 URL (기존 equipment와 충돌 방지)
    path('admin/', include(admin_router.urls)),
] 