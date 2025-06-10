from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

# Create your models here.

class CustomUserManager(UserManager):
    def create_user(self, username, password=None, **extra_fields):
        """
        user_name 필드가 올바르게 저장되도록 기본 create_user 메서드를 확장합니다.
        """
        # user_name을 last_name으로 저장
        user_name = extra_fields.pop('user_name', None)
        if user_name:
            extra_fields['last_name'] = user_name
        
        # 기본 메서드 호출
        user = super().create_user(username, password=password, **extra_fields)
        
        # last_name이 저장되지 않았는데 제공된 경우 직접 설정
        if user_name and not user.last_name:
            user.last_name = user_name
            user.save(update_fields=['last_name'])
            
        return user

class User(AbstractUser):
    is_initial_password = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    device_limit = models.IntegerField(default=3, help_text='최대 등록 가능한 장치 수')
    
    # 커스텀 매니저 설정
    objects = CustomUserManager()
    
    class Meta:
        db_table = 'users'

class Class(models.Model):
    GRADE_CHOICES = [
        (1, '1학년'),
        (2, '2학년'),
        (3, '3학년'),
    ]
    
    CLASS_CHOICES = [
        (1, '1반'),
        (2, '2반'),
        (3, '3반'),
        (4, '4반'),
    ]
    
    grade = models.IntegerField('학년', choices=GRADE_CHOICES)
    class_number = models.IntegerField('반', choices=CLASS_CHOICES)
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)

    class Meta:
        db_table = 'classes'
        unique_together = ('grade', 'class_number')
        ordering = ['grade', 'class_number']

    def __str__(self):
        return f"{self.grade}학년 {self.class_number}반"

    @classmethod
    def initialize_classes(cls):
        """모든 학반을 자동으로 생성하는 메서드"""
        for grade in range(1, 4):  # 1~3학년
            for class_num in range(1, 5):  # 1~4반
                cls.objects.get_or_create(
                    grade=grade,
                    class_number=class_num
                )

class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_info')
    current_class = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True, related_name='students')
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)

    class Meta:
        db_table = 'students'
        ordering = ['current_class']

    def __str__(self):
        return f"{self.user.get_full_name()}"
