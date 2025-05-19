from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# 라우터 설정
router = DefaultRouter()
router.register(r'password', views.PasswordViewSet, basename='password')

# 일반 사용자용 URL 패턴
urlpatterns = [
    # 라우터를 통한 URL 자동 생성
    path('', include(router.urls)),
    
    # UserViewSet의 me 액션은 라우터를 통해 등록되지 않으므로 직접 등록
    path('me/', views.UserViewSet.as_view({'get': 'me'}), name='current_user'),
]

# 관리자용 URL 패턴은 config/urls.py에서 admin_router를 통해 처리됩니다.
# 하지만 라우터로 처리할 수 없는 특수 관리자 기능은 여기에 추가합니다.
admin_urlpatterns = [
    # 관리자 특수 기능 - 비밀번호 초기화
    # 기존 경로를 유지하면서 PasswordViewSet.reset 액션을 연결
    path('users/<int:pk>/reset-password/', views.PasswordViewSet.as_view({'post': 'reset'}), name='reset_password'),
] 