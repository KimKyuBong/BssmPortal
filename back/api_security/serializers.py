from rest_framework import serializers
from django.contrib.auth.models import User
from .models import TOTPAPIKey, APIKeyUsageLog, SecurityPolicy
from django.utils import timezone
from datetime import timedelta


class UserSerializer(serializers.ModelSerializer):
    """사용자 정보 시리얼라이저"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class TOTPAPIKeyCreateSerializer(serializers.ModelSerializer):
    """API 키 생성 시리얼라이저"""
    
    class Meta:
        model = TOTPAPIKey
        fields = ['name', 'permissions', 'max_requests_per_minute', 'max_requests_per_hour', 'expires_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        policy = SecurityPolicy.get_default_policy()
        
        # TOTP 시크릿 키 생성
        totp_secret = TOTPAPIKey.generate_totp_secret()
        
        # API 키 생성
        api_key = TOTPAPIKey.generate_api_key()
        salt = secrets.token_hex(32)
        api_key_hash = TOTPAPIKey.hash_api_key(api_key, salt)
        
        # 만료 시간 설정
        if not validated_data.get('expires_at'):
            validated_data['expires_at'] = timezone.now() + timedelta(days=policy.key_expiry_days)
        
        # API 키 객체 생성
        totp_api_key = TOTPAPIKey.objects.create(
            user=user,
            totp_secret=totp_secret,
            api_key_hash=api_key_hash,
            salt=salt,
            **validated_data
        )
        
        # 생성된 API 키와 TOTP 정보를 컨텍스트에 저장
        self.context['generated_api_key'] = api_key
        self.context['totp_secret'] = totp_secret
        
        return totp_api_key


class TOTPAPIKeyDetailSerializer(serializers.ModelSerializer):
    """API 키 상세 정보 시리얼라이저"""
    
    user = UserSerializer(read_only=True)
    totp_qr_code = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    can_use = serializers.SerializerMethodField()
    
    class Meta:
        model = TOTPAPIKey
        fields = [
            'id', 'name', 'user', 'permissions', 'max_requests_per_minute', 
            'max_requests_per_hour', 'is_active', 'created_at', 'expires_at',
            'last_used_at', 'total_requests', 'failed_attempts', 'totp_qr_code',
            'is_expired', 'can_use'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'last_used_at', 'total_requests', 'failed_attempts']
    
    def get_totp_qr_code(self, obj):
        """TOTP QR 코드 생성"""
        import qrcode
        from io import BytesIO
        import base64
        
        # TOTP URI 생성
        totp_uri = f"otpauth://totp/{obj.user.username}:{obj.name}?secret={obj.totp_secret}&issuer=BSSM_Captive"
        
        # QR 코드 생성
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Base64로 인코딩
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_can_use(self, obj):
        return obj.can_make_request()


class TOTPAPIKeyListSerializer(serializers.ModelSerializer):
    """API 키 목록 시리얼라이저"""
    
    user = UserSerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()
    can_use = serializers.SerializerMethodField()
    
    class Meta:
        model = TOTPAPIKey
        fields = [
            'id', 'name', 'user', 'is_active', 'created_at', 'expires_at',
            'last_used_at', 'total_requests', 'failed_attempts', 'is_expired', 'can_use'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'last_used_at', 'total_requests', 'failed_attempts']
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_can_use(self, obj):
        return obj.can_make_request()


class TOTPVerificationSerializer(serializers.Serializer):
    """TOTP 코드 검증 시리얼라이저"""
    
    api_key = serializers.CharField(max_length=128, help_text="API 키")
    totp_code = serializers.CharField(max_length=10, help_text="TOTP 코드")
    
    def validate(self, attrs):
        api_key = attrs['api_key']
        totp_code = attrs['totp_code']
        
        # API 키 해시로 검색
        import hashlib
        import secrets
        
        # 모든 API 키를 순회하며 해시 비교
        for totp_api_key in TOTPAPIKey.objects.filter(is_active=True):
            if TOTPAPIKey.hash_api_key(api_key, totp_api_key.salt) == totp_api_key.api_key_hash:
                # TOTP 코드 검증
                if totp_api_key.verify_totp_code(totp_code):
                    attrs['api_key_obj'] = totp_api_key
                    return attrs
                else:
                    raise serializers.ValidationError("잘못된 TOTP 코드입니다.")
        
        raise serializers.ValidationError("유효하지 않은 API 키입니다.")


class APIKeyUsageLogSerializer(serializers.ModelSerializer):
    """API 키 사용 로그 시리얼라이저"""
    
    api_key_name = serializers.CharField(source='api_key.name', read_only=True)
    user_username = serializers.CharField(source='api_key.user.username', read_only=True)
    
    class Meta:
        model = APIKeyUsageLog
        fields = [
            'id', 'api_key_name', 'user_username', 'endpoint', 'method', 
            'ip_address', 'user_agent', 'status_code', 'response_time',
            'timestamp', 'success', 'error_message'
        ]
        read_only_fields = ['id', 'timestamp']


class SecurityPolicySerializer(serializers.ModelSerializer):
    """보안 정책 시리얼라이저"""
    
    class Meta:
        model = SecurityPolicy
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class APIKeyRegenerateSerializer(serializers.Serializer):
    """API 키 재생성 시리얼라이저"""
    
    totp_code = serializers.CharField(max_length=10, help_text="TOTP 코드")
    
    def validate_totp_code(self, value):
        api_key_obj = self.context.get('api_key_obj')
        if not api_key_obj.verify_totp_code(value):
            raise serializers.ValidationError("잘못된 TOTP 코드입니다.")
        return value


class APIKeyStatsSerializer(serializers.Serializer):
    """API 키 통계 시리얼라이저"""
    
    total_keys = serializers.IntegerField()
    active_keys = serializers.IntegerField()
    expired_keys = serializers.IntegerField()
    total_requests = serializers.IntegerField()
    failed_requests = serializers.IntegerField()
    success_rate = serializers.FloatField()
    recent_activity = serializers.ListField(child=serializers.DictField()) 