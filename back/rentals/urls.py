from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RentalViewSet, RentalRequestViewSet, EquipmentMacAddressViewSet, EquipmentReadOnlyViewSet

# 일반 라우터 구성 - 사용자용 기능만 등록
router = DefaultRouter()
router.register(r'equipment', EquipmentReadOnlyViewSet, basename='equipment')  # 사용자용 장비 조회
router.register(r'items', RentalViewSet)
router.register(r'requests', RentalRequestViewSet)
router.register(r'equipment-mac', EquipmentMacAddressViewSet)

urlpatterns = [
    # 라우터에 등록된 모든 URL 포함
    path('', include(router.urls)),
] 