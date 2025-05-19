from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EquipmentViewSet, RentalViewSet, RentalRequestViewSet, EquipmentMacAddressViewSet

# 일반 라우터 구성 - 모든 ViewSet 등록
router = DefaultRouter()
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'items', RentalViewSet)
router.register(r'requests', RentalRequestViewSet)
router.register(r'equipment-mac', EquipmentMacAddressViewSet)

urlpatterns = [
    # 라우터에 등록된 모든 URL 포함
    path('', include(router.urls)),
] 