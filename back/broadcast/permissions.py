from rest_framework.permissions import BasePermission

class IsTeacher(BasePermission):
    """
    교사(즉, is_staff=True)만 허용
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff 