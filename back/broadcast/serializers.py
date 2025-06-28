from rest_framework import serializers
from .models import DeviceMatrix, BroadcastHistory, AudioFile, BroadcastSchedule, BroadcastPreview

class DeviceMatrixSerializer(serializers.ModelSerializer):
    """장치 매트릭스 시리얼라이저"""
    
    class Meta:
        model = DeviceMatrix
        fields = [
            'id', 'device_name', 'room_id', 'position_row', 'position_col',
            'matrix_row', 'matrix_col', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class BroadcastHistorySerializer(serializers.ModelSerializer):
    """방송 이력 시리얼라이저"""
    broadcasted_by_username = serializers.CharField(source='broadcasted_by.username', read_only=True)
    broadcast_type_display = serializers.CharField(source='get_broadcast_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    audio_base64 = serializers.SerializerMethodField()
    
    class Meta:
        model = BroadcastHistory
        fields = [
            'id', 'broadcast_type', 'broadcast_type_display', 'content', 
            'target_rooms', 'language', 'auto_off', 'status', 'status_display',
            'error_message', 'broadcasted_by_username', 'created_at', 'completed_at',
            'audio_file', 'audio_base64'
        ]
        read_only_fields = ['id', 'created_at', 'completed_at']
    
    def get_audio_base64(self, obj):
        """오디오 파일이 있으면 base64로 인코딩하여 반환"""
        if obj.audio_file and obj.audio_file.file:
            try:
                import base64
                with obj.audio_file.file.open('rb') as f:
                    audio_data = f.read()
                    return base64.b64encode(audio_data).decode('utf-8')
            except Exception as e:
                # 파일 읽기 실패 시 None 반환
                return None
        return None

class AudioFileSerializer(serializers.ModelSerializer):
    """오디오 파일 시리얼라이저"""
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AudioFile
        fields = [
            'id', 'file', 'file_url', 'original_filename', 'file_size', 'file_size_mb',
            'duration', 'uploaded_by_username', 'created_at', 'is_active'
        ]
        read_only_fields = ['id', 'file_size', 'created_at']
    
    def get_file_size_mb(self, obj):
        """파일 크기를 MB 단위로 반환"""
        return obj.get_file_size_mb()
    
    def get_file_url(self, obj):
        """파일 URL 반환"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

class BroadcastScheduleSerializer(serializers.ModelSerializer):
    """방송 예약 시리얼라이저"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    broadcast_type_display = serializers.CharField(source='get_broadcast_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = BroadcastSchedule
        fields = [
            'id', 'title', 'broadcast_type', 'broadcast_type_display', 'content',
            'target_rooms', 'language', 'auto_off', 'scheduled_at', 'status', 
            'status_display', 'created_by_username', 'created_at', 'audio_file'
        ]
        read_only_fields = ['id', 'created_at']

class TextBroadcastSerializer(serializers.Serializer):
    """텍스트 방송 요청 시리얼라이저"""
    text = serializers.CharField(
        max_length=500,
        help_text="방송할 텍스트 (최대 500자)"
    )
    target_rooms = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="방송할 방 번호 목록 (예: ['101', '102', '201'])"
    )
    language = serializers.ChoiceField(
        choices=[('ko', '한국어'), ('en', '영어'), ('zh', '중국어'), ('ja', '일본어'), ('es', '스페인어'), ('fr', '프랑스어')],
        default='ko',
        help_text="텍스트 언어"
    )
    auto_off = serializers.BooleanField(
        default=False,
        help_text="방송 후 자동으로 장치 끄기"
    )
    
    def validate_text(self, value):
        """텍스트 검증"""
        if not value.strip():
            raise serializers.ValidationError("방송할 텍스트를 입력해주세요.")
        return value.strip()
    
    def validate_target_rooms(self, value):
        """대상 방 검증"""
        if value:
            # 방 번호가 숫자인지 확인
            for room in value:
                if not room.isdigit():
                    raise serializers.ValidationError("방 번호는 숫자여야 합니다.")
        return value

class AudioBroadcastSerializer(serializers.Serializer):
    """오디오 방송 요청 시리얼라이저"""
    audio_file = serializers.FileField(
        required=True,
        help_text="방송할 오디오 파일"
    )
    target_rooms = serializers.CharField(
        required=False,
        help_text="방송할 방 번호 목록 (JSON 문자열)"
    )
    auto_off = serializers.BooleanField(
        default=False,
        help_text="방송 후 자동으로 장치 끄기"
    )
    
    def validate_target_rooms(self, value):
        """대상 방 검증"""
        if value:
            try:
                # JSON 문자열을 파싱
                import json
                if isinstance(value, str):
                    room_list = json.loads(value)
                else:
                    room_list = value
                
                # 방 번호가 숫자인지 확인
                for room in room_list:
                    if not str(room).isdigit():
                        raise serializers.ValidationError("방 번호는 숫자여야 합니다.")
                
                return room_list
            except json.JSONDecodeError:
                raise serializers.ValidationError("target_rooms는 유효한 JSON 형식이어야 합니다.")
        return value

class DeviceMatrixSyncSerializer(serializers.Serializer):
    """장치 매트릭스 동기화 시리얼라이저"""
    force_sync = serializers.BooleanField(
        default=False,
        help_text="강제 동기화 여부"
    )

class BroadcastStatusSerializer(serializers.Serializer):
    """방송 시스템 상태 시리얼라이저"""
    total_devices = serializers.IntegerField(read_only=True)
    recent_broadcasts = serializers.IntegerField(read_only=True)
    total_audio_files = serializers.IntegerField(read_only=True)
    system_healthy = serializers.BooleanField(read_only=True)

class BroadcastPreviewSerializer(serializers.ModelSerializer):
    """방송 프리뷰 시리얼라이저"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    broadcast_type_display = serializers.CharField(source='get_broadcast_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    preview_url = serializers.SerializerMethodField()
    approval_endpoint = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = BroadcastPreview
        fields = [
            'id', 'preview_id', 'broadcast_type', 'broadcast_type_display', 'content',
            'target_rooms', 'language', 'auto_off', 'status', 'status_display',
            'audio_file', 'created_by_username', 'approved_by_username', 'created_at',
            'expires_at', 'approved_at', 'rejection_reason', 'preview_url',
            'approval_endpoint', 'is_expired'
        ]
        read_only_fields = ['id', 'preview_id', 'created_at', 'expires_at', 'approved_at']
    
    def get_preview_url(self, obj):
        """프리뷰 오디오 파일 URL 반환"""
        return obj.get_preview_url()
    
    def get_approval_endpoint(self, obj):
        """승인 엔드포인트 URL 반환"""
        return obj.get_approval_endpoint()
    
    def get_is_expired(self, obj):
        """프리뷰 만료 여부 반환"""
        return obj.is_expired()

class PreviewResponseSerializer(serializers.Serializer):
    """프리뷰 응답 시리얼라이저"""
    success = serializers.BooleanField()
    status = serializers.CharField()
    preview_info = serializers.DictField()
    message = serializers.CharField()

class PreviewApprovalSerializer(serializers.Serializer):
    """프리뷰 승인/거부 시리얼라이저"""
    action = serializers.ChoiceField(
        choices=[('approve', '승인'), ('reject', '거부')],
        help_text="승인 또는 거부"
    )
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="거부 사유 (거부 시에만 필요)"
    )
    
    def validate(self, data):
        """데이터 검증"""
        if data['action'] == 'reject' and not data.get('rejection_reason'):
            raise serializers.ValidationError("거부 시에는 거부 사유를 입력해주세요.")
        return data

class AudioPreviewSerializer(serializers.Serializer):
    """오디오 프리뷰 요청 시리얼라이저"""
    target_rooms = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="방송할 방 번호 목록 (예: ['101', '102', '201'])"
    )
    auto_off = serializers.BooleanField(
        default=False,
        help_text="방송 후 자동으로 장치 끄기"
    )
    
    def validate_target_rooms(self, value):
        """대상 방 검증"""
        if value:
            # 방 번호가 숫자인지 확인
            for room in value:
                if not room.isdigit():
                    raise serializers.ValidationError("방 번호는 숫자여야 합니다.")
        return value 