from rest_framework import serializers
from .models import User, Class, Student
from django.db.models import Count

class UserSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    ip_count = serializers.SerializerMethodField()
    rental_count = serializers.SerializerMethodField()
    
    def get_email(self, obj):
        """
        이메일이 None인 경우 빈 문자열 반환
        """
        return "" if obj.email is None else obj.email
        
    def get_ip_count(self, obj):
        return obj.devices.filter(is_active=True).count()

    def get_rental_count(self, obj):
        return obj.rentals.filter(status='RENTED').count()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'last_name', 'is_staff', 'is_superuser', 'is_initial_password', 'created_at', 'is_active', 'ip_count', 'rental_count', 'device_limit']
        read_only_fields = ['created_at', 'is_initial_password', 'ip_count', 'rental_count']

class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'last_name', 'is_staff', 'is_superuser']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # last_name 필드 별도 저장
        last_name = validated_data.get('last_name', '')
        
        user = User.objects.create_user(**validated_data)
        
        # last_name이 저장되지 않았다면 직접 설정
        if last_name and not user.last_name:
            user.last_name = last_name
            user.save(update_fields=['last_name'])
        
        return user

class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ['id', 'grade', 'class_number']

class StudentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    ip_count = serializers.SerializerMethodField()
    rental_count = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'user', 'username', 'user_name', 'current_class', 'ip_count', 'rental_count']

    def get_ip_count(self, obj):
        # user의 devices 관계를 활용해 개수 반환
        return obj.user.devices.filter(is_active=True).count() if hasattr(obj.user, 'devices') else 0

    def get_rental_count(self, obj):
        # user의 rentals 관계를 활용해 대여중인 장비 개수 반환
        return obj.user.rentals.filter(status='RENTED').count() if hasattr(obj.user, 'rentals') else 0 