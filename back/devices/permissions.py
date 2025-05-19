from rest_framework.permissions import BasePermission, IsAuthenticated

class IsSuperUser(BasePermission):
    """관리자 권한 확인 클래스"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_superuser

class IsStaffUser(BasePermission):
    """교사 권한 확인 클래스"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)

class IsOwnerOrStaff(BasePermission):
    """자신의 장치 또는 교사만 조회/수정 가능"""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # 관리자 또는 교사는 모든 장치에 접근 가능
        if request.user.is_superuser or request.user.is_staff:
            return True
            
        # 일반 사용자는 자신의 장치만 접근 가능
        return obj.user == request.user
