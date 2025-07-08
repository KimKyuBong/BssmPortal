from rest_framework import permissions
from rest_framework.permissions import BasePermission
from django.contrib.auth import get_user_model

User = get_user_model()


class PermissionMatrix:
    """
    권한 매트릭스 - 각 앱과 액션별 권한을 중앙에서 관리
    """
    
    # 앱별 권한 정의
    PERMISSIONS = {
        'users': {
            'list': ['admin'],
            'create': ['admin'],
            'retrieve': ['admin'],
            'update': ['admin'],
            'destroy': ['admin'],
            'reset_password': ['admin'],
            'change_password': ['authenticated'],
            'me': ['authenticated'],  # 자신의 정보 조회는 인증된 사용자 누구나 가능
            'all': ['admin'],  # 모든 사용자 조회는 관리자만
            'export': ['admin'],  # 엑셀 내보내기는 관리자만
            'import_users': ['admin'],  # 사용자 일괄 추가는 관리자만
            'simple': ['authenticated'],  # 간단한 사용자 목록은 인증된 사용자
        },
        'devices': {
            'list': ['authenticated'],
            'create': ['admin'],
            'retrieve': ['authenticated'],
            'update': ['admin'],
            'destroy': ['admin'],
            'all': ['admin'],
            'statistics': ['admin'],
            'reassign_ip': ['admin'],
            'toggle_active': ['admin'],
            'current_mac': ['authenticated'],
            'register': ['authenticated'],
            'by_mac': ['any'],
        },
        'rentals': {
            'equipment': {
                'list': ['admin'],
                'create': ['admin'],
                'retrieve': ['authenticated'],
                'update': ['admin'],
                'destroy': ['admin'],
                'available': ['authenticated'],
                'export_excel': ['admin'],
                'import_excel': ['admin'],
                'register': ['any'],
                'by_mac': ['any'],
                'update_by_model': ['admin'],
                'get_model_info': ['admin'],
                'history': ['admin'],
            },
            'rental': {
                'list': ['admin'],
                'create': ['authenticated'],
                'retrieve': ['authenticated'],
                'update': ['admin'],
                'destroy': ['admin'],
                'my_rentals': ['authenticated'],
                'my_history': ['authenticated'],
                'return_equipment': ['authenticated'],
            },
            'rental_request': {
                'list': ['admin'],
                'create': ['authenticated'],
                'retrieve': ['authenticated'],
                'update': ['authenticated'],
                'destroy': ['admin'],
                'pending': ['admin'],
                'approve': ['admin'],
                'reject': ['admin'],
                'process': ['admin'],
                'my_requests': ['authenticated'],
                'update_reason': ['authenticated'],
                'resubmit': ['authenticated'],
                'export_excel': ['admin'],
            },
            'equipment_mac': {
                'list': ['any'],
                'create': ['any'],
                'retrieve': ['any'],
                'update': ['any'],
                'destroy': ['any'],
                'login_and_rent': ['any'],
            },
        },
        'system': {
            'health_check': ['any'],
            'system_info': ['admin'],
            'backup': ['admin'],
            'restore': ['admin'],
        },
        'broadcast': {
            'list': ['authenticated'],
            'create': ['teacher'],
            'retrieve': ['authenticated'],
            'update': ['teacher'],
            'destroy': ['teacher'],
            'send': ['teacher'],
            'schedule': ['teacher'],
            'cancel': ['teacher'],
            'history': ['authenticated'],
        },
        'dns': {
            'list': ['authenticated'],
            'create': ['admin'],
            'retrieve': ['authenticated'],
            'update': ['admin'],
            'destroy': ['admin'],
            'download': ['any'],
            'ocsp': ['any'],
        },
        'api_security': {
            'list': ['authenticated'],
            'create': ['authenticated'],
            'retrieve': ['authenticated'],
            'update': ['authenticated'],
            'destroy': ['authenticated'],
            'generate': ['admin'],
            'revoke': ['admin'],
        },
    }
    
    @classmethod
    def get_required_permissions(cls, app_name, model_name=None, action=None):
        """
        특정 앱/모델/액션에 필요한 권한을 반환
        """
        app_permissions = cls.PERMISSIONS.get(app_name, {})
        
        if model_name and model_name in app_permissions:
            model_permissions = app_permissions[model_name]
            if action:
                return model_permissions.get(action, ['admin'])  # 기본값은 admin
            return model_permissions
        elif action:
            return app_permissions.get(action, ['admin'])  # 기본값은 admin
        
        return app_permissions


class RoleBasedPermission(BasePermission):
    """
    역할 기반 권한 클래스
    """
    
    def __init__(self, app_name, model_name=None, action=None):
        self.app_name = app_name
        self.model_name = model_name
        self.action = action
        super().__init__()
    
    def has_permission(self, request, view):
        # 액션 이름 결정
        action = self.action or getattr(view, 'action', None)
        if not action:
            # HTTP 메서드 기반으로 액션 추정
            if request.method == 'GET':
                # lookup_url_kwarg가 있는 ViewSet의 경우에만 확인
                lookup_url_kwarg = getattr(view, 'lookup_url_kwarg', None)
                if lookup_url_kwarg and hasattr(view, 'kwargs') and lookup_url_kwarg in view.kwargs:
                    action = 'retrieve'
                else:
                    action = 'list'
            elif request.method == 'POST':
                action = 'create'
            elif request.method in ['PUT', 'PATCH']:
                action = 'update'
            elif request.method == 'DELETE':
                action = 'destroy'
        
        # 필요한 권한 조회
        required_permissions = PermissionMatrix.get_required_permissions(
            self.app_name, self.model_name, action
        )
        
        # 권한 체크
        return self._check_permissions(request, required_permissions)
    
    def _check_permissions(self, request, required_permissions):
        """
        사용자가 필요한 권한을 가지고 있는지 확인
        """
        if not request.user.is_authenticated:
            return 'any' in required_permissions
        
        # 권한 우선순위: any < authenticated < teacher < admin
        user_permissions = self._get_user_permissions(request.user)
        
        for required_perm in required_permissions:
            if required_perm in user_permissions:
                return True
        
        return False
    
    def _get_user_permissions(self, user):
        """
        사용자의 권한 레벨을 반환
        """
        permissions = ['any', 'authenticated']
        
        if user.is_superuser:
            permissions.extend(['admin', 'teacher'])
        elif user.is_staff:
            permissions.append('teacher')
        
        return permissions


# 편의를 위한 권한 클래스들
class IsAdminUser(BasePermission):
    """관리자만 접근 가능"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_superuser


class IsTeacherUser(BasePermission):
    """교사 이상 접근 가능"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)


class IsAuthenticatedUser(BasePermission):
    """인증된 사용자 접근 가능"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsOwnerOrAdmin(BasePermission):
    """본인 또는 관리자만 접근 가능"""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


# 앱별 권한 클래스들
class UserPermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('users', action=action)


class DevicePermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('devices', action=action)


class EquipmentPermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('rentals', 'equipment', action)


class RentalPermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('rentals', 'rental', action)


class RentalRequestPermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('rentals', 'rental_request', action)


class SystemPermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('system', action=action)


class BroadcastPermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('broadcast', action=action)


class DnsPermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('dns', action=action)


class ApiSecurityPermissions(RoleBasedPermission):
    def __init__(self, action=None):
        super().__init__('api_security', action=action) 