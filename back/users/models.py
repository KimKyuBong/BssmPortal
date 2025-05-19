from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

# Create your models here.

class CustomUserManager(UserManager):
    def create_user(self, username, password=None, **extra_fields):
        """
        last_name 필드가 올바르게 저장되도록 기본 create_user 메서드를 확장합니다.
        """
        # last_name을 별도로 저장
        last_name = extra_fields.get('last_name', '')
        
        # 기본 메서드 호출
        user = super().create_user(username, password=password, **extra_fields)
        
        # last_name이 저장되지 않았는데 제공된 경우 직접 설정
        if last_name and not user.last_name:
            user.last_name = last_name
            user.save(update_fields=['last_name'])
            
        return user

class User(AbstractUser):
    is_initial_password = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # 커스텀 매니저 설정
    objects = CustomUserManager()
    
    class Meta:
        db_table = 'users'
