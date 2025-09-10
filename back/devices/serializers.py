from rest_framework import serializers
from .models import Device, DeviceHistory
from django.contrib.auth import get_user_model

User = get_user_model()

class DeviceHistorySerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    device_mac = serializers.CharField(source='mac_address')
    device_name = serializers.SerializerMethodField()
    action = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='created_at')
    details = serializers.SerializerMethodField()
    
    class Meta:
        model = DeviceHistory
        fields = ['id', 'user', 'username', 'device_mac', 'device_name', 
                 'action', 'timestamp', 'details']
        read_only_fields = fields  # 모든 필드를 읽기 전용으로 설정
        
    def get_username(self, obj):
        return obj.user.username if obj.user else None
        
    def get_user(self, obj):
        if not obj.user:
            return None
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email,
            'is_staff': obj.user.is_staff
        }
        
    def get_device_name(self, obj):
        return obj.device_name
        
    def get_action(self, obj):
        # REGISTER/UNREGISTER를 create/delete로 변환
        if obj.action == 'REGISTER':
            return 'create'
        elif obj.action == 'UNREGISTER':
            return 'delete'
        elif obj.action == 'REASSIGN_IP_BLACKLIST':
            return 'update'
        return 'update'
        
    def get_details(self, obj):
        # 액션에 따른 세부 설명 생성
        if obj.action == 'REGISTER':
            return f"{obj.device_name} 기기가 등록되었습니다. (IP: {obj.assigned_ip or '미할당'})"
        elif obj.action == 'UNREGISTER':
            return f"{obj.device_name} 기기가 삭제되었습니다."
        elif obj.action == 'REASSIGN_IP_BLACKLIST':
            return f"{obj.device_name} 기기의 IP가 블랙리스트로 인해 {obj.assigned_ip}로 변경되었습니다."
        return f"{obj.device_name} 기기가 업데이트되었습니다."

class DeviceDetailSerializer(serializers.ModelSerializer):
    history = DeviceHistorySerializer(many=True, read_only=True)
    username = serializers.SerializerMethodField()
    
    class Meta:
        model = Device
        fields = ['id', 'mac_address', 'device_name', 'assigned_ip', 
                 'is_active', 'last_access', 'created_at', 'history',
                 'user', 'username']
                 
    def get_username(self, obj):
        return obj.user.username if obj.user else None

class DeviceSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    user_full_name = serializers.SerializerMethodField()
    dns_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Device
        fields = ['id', 'mac_address', 'device_name', 'assigned_ip', 'is_active', 'created_at', 'last_access', 'user', 'username', 'user_full_name', 'dns_info']
        read_only_fields = ['user', 'username', 'user_full_name', 'last_access', 'is_active', 'created_at', 'dns_info']
        extra_kwargs = {
            'assigned_ip': {'required': False},  # IP 주소를 선택적으로 설정
            'mac_address': {'required': True},  # MAC 주소는 필수
            'device_name': {'required': True},  # 장치 이름은 필수
        }
        
    def validate(self, data):
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"DeviceSerializer validate 호출됨: 데이터={data}")
        return data
        
    def get_username(self, obj):
        return obj.user.username if obj.user else None

    def get_user_full_name(self, obj):
        if not obj.user:
            return None
        first_name = obj.user.first_name or ''
        last_name = obj.user.last_name or ''
        return f"{last_name}{first_name}".strip() or None
        
    def get_dns_info(self, obj):
        """해당 IP의 DNS 정보를 반환"""
        from dns.utils import get_dns_info_for_device
        return get_dns_info_for_device(obj) 