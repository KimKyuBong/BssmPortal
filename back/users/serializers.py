from rest_framework import serializers
from .models import User, Class, Student
from django.db.models import Count

class UserSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    ip_count = serializers.SerializerMethodField()
    rental_count = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    
    def get_email(self, obj):
        """
        이메일이 None인 경우 빈 문자열 반환
        """
        return "" if obj.email is None else obj.email
        
    def get_ip_count(self, obj):
        return obj.devices.filter(is_active=True).count()

    def get_rental_count(self, obj):
        return obj.rentals.filter(status='RENTED').count()

    def get_user_name(self, obj):
        """
        first_name과 last_name을 합쳐서 user_name으로 반환
        """
        first_name = str(obj.first_name or '').strip()
        last_name = str(obj.last_name or '').strip()
        
        if not first_name and not last_name:
            return obj.username
            
        return f"{last_name} {first_name}".strip()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'user_name', 'is_staff', 'is_superuser', 'is_initial_password', 'created_at', 'is_active', 'ip_count', 'rental_count', 'device_limit']
        read_only_fields = ['created_at', 'is_initial_password', 'ip_count', 'rental_count', 'user_name']

class UserCreateSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'user_name', 'is_staff', 'is_superuser']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        # user_name을 last_name으로 저장
        user_name = validated_data.pop('user_name', None)
        if user_name:
            validated_data['last_name'] = user_name
        
        user = User.objects.create_user(**validated_data)
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
    device_limit = serializers.IntegerField(source='user.device_limit', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'user', 'username', 'user_name', 'current_class', 'ip_count', 'rental_count', 'device_limit']

    def get_ip_count(self, obj):
        # user의 devices 관계를 활용해 개수 반환
        return obj.user.devices.filter(is_active=True).count() if hasattr(obj.user, 'devices') else 0

    def get_rental_count(self, obj):
        # user의 rentals 관계를 활용해 대여중인 장비 개수 반환
        return obj.user.rentals.filter(status='RENTED').count() if hasattr(obj.user, 'rentals') else 0 

class TeacherSerializer(UserSerializer):
    ip_count = serializers.SerializerMethodField()
    rental_count = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['ip_count', 'rental_count']

    def get_ip_count(self, obj):
        return obj.devices.filter(is_active=True).count() if hasattr(obj, 'devices') else 0

    def get_rental_count(self, obj):
        return obj.rentals.filter(status='RENTED').count() if hasattr(obj, 'rentals') else 0 