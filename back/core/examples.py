"""
중앙화된 권한 관리 시스템 사용 예제

이 파일은 새로운 권한 관리 시스템을 어떻게 사용하는지 보여주는 예제입니다.
실제 프로덕션에서는 이 파일을 사용하지 않습니다.
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from core.permissions import (
    EquipmentPermissions, RentalPermissions, RentalRequestPermissions,
    DevicePermissions, UserPermissions, SystemPermissions,
)


# 예제 1: 장비 관리 ViewSet
class ExampleEquipmentViewSet(viewsets.ModelViewSet):
    """
    장비 관리 예제 - 중앙화된 권한 관리 사용
    
    권한 매트릭스에 정의된 대로:
    - list, create, update, destroy: 관리자만
    - retrieve: 인증된 사용자
    - available: 인증된 사용자
    - export_excel, import_excel: 관리자만
    """
    permission_classes = [EquipmentPermissions]
    
    # 별도의 get_permissions 메서드나 액션별 권한 데코레이터가 필요 없음
    # 모든 권한이 중앙에서 관리됨
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """대여 가능한 장비 목록 - 인증된 사용자 접근 가능"""
        pass
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """엑셀 내보내기 - 관리자만 접근 가능"""
        pass


# 예제 2: 대여 관리 ViewSet
class ExampleRentalViewSet(viewsets.ModelViewSet):
    """
    대여 관리 예제
    
    권한 매트릭스에 정의된 대로:
    - list, update, destroy: 관리자만
    - create, retrieve: 인증된 사용자
    - my_rentals, my_history: 인증된 사용자
    """
    permission_classes = [RentalPermissions]
    
    @action(detail=False, methods=['get'])
    def my_rentals(self, request):
        """내 대여 목록 - 인증된 사용자 접근 가능"""
        pass


# 예제 3: 시스템 관리 ViewSet
class ExampleSystemViewSet(viewsets.ViewSet):
    """
    시스템 관리 예제
    
    권한 매트릭스에 정의된 대로:
    - health_check: 누구나
    - system_info, backup, restore: 관리자만
    """
    permission_classes = [SystemPermissions]
    
    @action(detail=False, methods=['get'])
    def health_check(self, request):
        """헬스 체크 - 누구나 접근 가능"""
        pass
    
    @action(detail=False, methods=['get'])
    def system_info(self, request):
        """시스템 정보 - 관리자만 접근 가능"""
        pass


# 권한 매트릭스 확인 예제
def check_permissions_example():
    """
    권한 매트릭스에서 특정 권한을 확인하는 예제
    """
    from core.permissions import PermissionMatrix
    
    # 장비 목록 조회에 필요한 권한 확인
    equipment_list_permissions = PermissionMatrix.get_required_permissions(
        'rentals', 'equipment', 'list'
    )
    print(f"장비 목록 조회 권한: {equipment_list_permissions}")  # ['admin']
    
    # 대여 가능 장비 조회에 필요한 권한 확인
    available_permissions = PermissionMatrix.get_required_permissions(
        'rentals', 'equipment', 'available'
    )
    print(f"대여 가능 장비 조회 권한: {available_permissions}")  # ['authenticated']
    
    # 헬스 체크에 필요한 권한 확인
    health_check_permissions = PermissionMatrix.get_required_permissions(
        'system', action='health_check'
    )
    print(f"헬스 체크 권한: {health_check_permissions}")  # ['any']


# 권한 레벨 설명
PERMISSION_LEVELS = {
    'any': '누구나 접근 가능 (인증 불필요)',
    'authenticated': '인증된 사용자만 접근 가능',
    'teacher': '교사(is_staff) 이상 접근 가능',
    'admin': '관리자(is_superuser)만 접근 가능'
}

# 권한 우선순위
PERMISSION_HIERARCHY = [
    'any',           # 가장 낮은 권한
    'authenticated', # 인증된 사용자
    'teacher',       # 교사
    'admin'          # 가장 높은 권한
] 