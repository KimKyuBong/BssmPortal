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
            'create': ['authenticated'],  # 일반 사용자도 기기 생성 가능
            'retrieve': ['authenticated'],
            'update': ['authenticated'],  # 일반 사용자도 자신의 기기 정보 수정 가능
            'destroy': ['authenticated'],  # 자신의 기기는 삭제 가능 (perform_destroy에서 권한 체크)
            'my': ['authenticated'],  # 내 기기 목록 조회 권한 추가
            'my_history': ['authenticated'],  # 내 기기 이력 조회 권한 추가
            'user': ['admin'],  # 특정 사용자 이력 조회는 관리자만
            'simple': ['admin'],  # 간단한 이력 목록은 관리자 대시보드용
            'device_history': ['authenticated'],  # 특정 MAC 주소 이력 조회 (자신의 것만)
            'user_rentals': ['authenticated'],  # 사용자 IP 대여 내역 조회
            'user_equipment_rentals': ['authenticated'],  # 사용자 장비 대여 내역 조회
            'blacklist_ip': ['admin'],  # IP 블랙리스트 추가는 관리자만
            'unblacklist_ip': ['admin'],  # IP 블랙리스트 제거는 관리자만
            'blacklisted_ips': ['admin'],  # 블랙리스트 IP 목록 조회는 관리자만
            'all': ['admin'],
            'statistics': ['admin'],
            'reassign_ip': ['admin'],
            'toggle_active': ['admin'],
            'get_current_mac': ['authenticated'],
            'register': ['authenticated'],  # register_manual 액션용
            'by_mac': ['any'],
        },
        'rentals': {
            'equipment': {
                'list': ['admin'],
                'create': ['authenticated'],
                'retrieve': ['authenticated'],
                'update': ['admin'],
                'destroy': ['admin'],
                'available': ['authenticated'],
                'export_excel': ['admin'],
                'import_excel': ['admin'],
                'register': ['any'],
                'register_maintenance': ['any'],  # PXE 부팅 환경에서 인증 없이 장비 등록 허용
                'report_status': ['any'],  # 비로그인 장비 상태 보고 허용
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
            'rentalrequest': {
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
            'create': ['authenticated'],
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
        # 액션 이름 결정 - ViewSet의 action 속성을 우선 사용
        action = self.action or getattr(view, 'action', None)
        
        # URL resolver에서 액션 추출
        if hasattr(request, 'resolver_match') and request.resolver_match:
            url_name = request.resolver_match.url_name
            if url_name and '-' in url_name:
                # admin-equipment-register-maintenance 형태에서 마지막 부분 추출
                parts = url_name.split('-')
                if len(parts) >= 3 and 'register' in parts:
                    if 'maintenance' in parts:
                        action = 'register_maintenance'
                    else:
                        action = 'register'
                elif 'report' in parts and 'status' in parts:
                    action = 'report_status'
                elif 'by-mac' in url_name or 'mac' in parts:
                    action = 'by_mac'
        
        # URL 경로에서 직접 추출 (fallback)
        if not action or action in ['create', 'list', 'retrieve', 'update', 'destroy']:
            path = request.path
            if 'register_maintenance' in path:
                action = 'register_maintenance'
            elif 'register' in path and 'register_maintenance' not in path:
                action = 'register'  
            elif 'report-status' in path or 'report_status' in path:
                action = 'report_status'
            elif 'by_mac' in path:
                action = 'by_mac'
        
        # 커스텀 액션이 설정되지 않은 경우 HTTP 메서드로 추정
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


# 기본 권한 클래스 - 앱 이름을 자동으로 감지
class DefaultAppPermissions(RoleBasedPermission):
    """
    기본 권한 클래스 - 뷰의 앱 이름을 자동으로 감지하여 권한 체크
    사용법: permission_classes = [DefaultAppPermissions()] (기본값)
    """
    def __init__(self, app_name=None, model_name=None, action=None):
        super().__init__(app_name, model_name, action)
    
    def has_permission(self, request, view):
        # 앱 이름이 지정되지 않은 경우 뷰에서 자동 감지
        if not self.app_name:
            self.app_name = self._detect_app_name(view)
        # 모델 이름이 지정되지 않은 경우 뷰에서 자동 감지
        if not self.model_name:
            self.model_name = self._detect_model_name(view)
        return super().has_permission(request, view)
    
    def _detect_app_name(self, view):
        """뷰에서 앱 이름을 자동으로 감지"""
        # ViewSet의 경우
        if hasattr(view, 'get_queryset'):
            try:
                queryset = view.get_queryset()
                if queryset is not None:
                    model = queryset.model
                    return model._meta.app_label
            except Exception:
                pass  # get_queryset에서 예외 발생 시 무시하고 아래로 진행
        # APIView의 경우 클래스 이름에서 추정
        class_name = view.__class__.__name__.lower()
        if 'user' in class_name:
            return 'users'
        elif 'device' in class_name:
            return 'devices'
        elif 'equipment' in class_name or 'rental' in class_name:
            return 'rentals'
        elif 'broadcast' in class_name:
            return 'broadcast'
        elif 'dns' in class_name:
            return 'dns'
        elif 'api' in class_name and 'security' in class_name:
            return 'api_security'
        elif 'system' in class_name:
            return 'system'
        # 기본값
        return 'users'
    
    def _detect_model_name(self, view):
        """뷰에서 모델 이름을 자동으로 감지"""
        # ViewSet의 경우
        if hasattr(view, 'get_queryset'):
            try:
                queryset = view.get_queryset()
                if queryset is not None:
                    model = queryset.model
                    return model._meta.model_name
            except Exception:
                pass  # get_queryset에서 예외 발생 시 무시하고 아래로 진행
        
        # 클래스 이름에서 추정
        class_name = view.__class__.__name__.lower()
        if 'equipment' in class_name:
            return 'equipment'
        elif 'rentalrequest' in class_name:
            return 'rentalrequest'
        elif 'rental' in class_name:
            return 'rental'
        elif 'equipmentmac' in class_name:
            return 'equipment_mac'
        elif 'user' in class_name:
            return 'user'
        elif 'device' in class_name:
            return 'device'
        elif 'broadcast' in class_name:
            return 'broadcast'
        elif 'dns' in class_name:
            return 'dns'
        elif 'apisecurity' in class_name:
            return 'api_security'
        elif 'system' in class_name:
            return 'system'
        
        # 기본값
        return None


# 범용 권한 클래스 - 명시적으로 앱 이름 지정
class AppPermissions(RoleBasedPermission):
    """
    범용 권한 클래스 - 앱 이름과 액션을 파라미터로 받아 권한 체크
    사용법: permission_classes = [AppPermissions('users', 'list')]
    """
    def __init__(self, app_name, model_name=None, action=None):
        super().__init__(app_name, model_name, action) 