from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()
    
    def get_email(self, obj):
        """
        이메일 필드가 None이면 빈 문자열 반환
        """
        return "" if obj.email is None else obj.email
        
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'last_name', 'is_staff', 'is_superuser', 'is_initial_password', 'created_at', 'is_active']
        read_only_fields = ['created_at']

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