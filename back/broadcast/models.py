from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator
import os
import uuid

User = get_user_model()

class DeviceMatrix(models.Model):
    """장치 매트릭스 정보를 저장하는 모델"""
    device_name = models.CharField(max_length=100, verbose_name="장치명")
    room_id = models.IntegerField(unique=True, verbose_name="방 번호")
    position_row = models.IntegerField(verbose_name="행 위치")
    position_col = models.IntegerField(verbose_name="열 위치")
    matrix_row = models.IntegerField(verbose_name="매트릭스 행")
    matrix_col = models.IntegerField(verbose_name="매트릭스 열")
    is_active = models.BooleanField(default=True, verbose_name="활성화 상태")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")

    class Meta:
        db_table = 'broadcast_device_matrix'
        verbose_name = "장치 매트릭스"
        verbose_name_plural = "장치 매트릭스"
        ordering = ['matrix_row', 'matrix_col']

    def __str__(self):
        return f"{self.device_name} (방 {self.room_id})"

class AudioFile(models.Model):
    """업로드된 오디오 파일을 관리하는 모델"""
    def audio_upload_path(instance, filename):
        """오디오 파일 업로드 경로 생성"""
        ext = filename.split('.')[-1]
        return f'audio/{instance.uploaded_by.id}/{instance.created_at.strftime("%Y%m%d")}/{filename}'

    file = models.FileField(
        upload_to=audio_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['mp3', 'wav', 'ogg', 'm4a'])],
        verbose_name="오디오 파일"
    )
    original_filename = models.CharField(max_length=255, verbose_name="원본 파일명")
    file_size = models.BigIntegerField(verbose_name="파일 크기 (bytes)")
    duration = models.FloatField(null=True, blank=True, verbose_name="재생 시간 (초)")
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="업로드자")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="업로드일")
    is_active = models.BooleanField(default=True, verbose_name="활성화 상태")

    class Meta:
        db_table = 'broadcast_audio_files'
        verbose_name = "오디오 파일"
        verbose_name_plural = "오디오 파일"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.original_filename} ({self.uploaded_by.username})"

    def get_file_size_mb(self):
        """파일 크기를 MB 단위로 반환"""
        return round(self.file_size / (1024 * 1024), 2)

class BroadcastHistory(models.Model):
    """방송 이력을 저장하는 모델"""
    BROADCAST_TYPE_CHOICES = [
        ('text', '텍스트 방송'),
        ('audio', '음성 방송'),
    ]
    
    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('broadcasting', '방송중'),
        ('completed', '완료'),
        ('failed', '실패'),
    ]

    broadcast_type = models.CharField(max_length=10, choices=BROADCAST_TYPE_CHOICES, verbose_name="방송 타입")
    content = models.TextField(verbose_name="방송 내용")
    target_rooms = models.JSONField(default=list, verbose_name="대상 방 목록")
    language = models.CharField(max_length=5, default='ko', verbose_name="언어")
    auto_off = models.BooleanField(default=False, verbose_name="자동 끄기")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="상태")
    error_message = models.TextField(blank=True, null=True, verbose_name="오류 메시지")
    external_response = models.JSONField(blank=True, null=True, verbose_name="외부 API 응답")
    audio_file = models.ForeignKey(AudioFile, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="방송 오디오 파일")
    broadcasted_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="방송자")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="완료일")

    class Meta:
        db_table = 'broadcast_history'
        verbose_name = "방송 이력"
        verbose_name_plural = "방송 이력"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_broadcast_type_display()} - {self.broadcasted_by.username} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"

class BroadcastSchedule(models.Model):
    """예약 방송을 관리하는 모델"""
    BROADCAST_TYPE_CHOICES = [
        ('text', '텍스트 방송'),
        ('audio', '음성 방송'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', '예약됨'),
        ('broadcasting', '방송중'),
        ('completed', '완료'),
        ('cancelled', '취소됨'),
    ]

    title = models.CharField(max_length=200, verbose_name="방송 제목")
    broadcast_type = models.CharField(max_length=10, choices=BROADCAST_TYPE_CHOICES, verbose_name="방송 타입")
    content = models.TextField(verbose_name="방송 내용")
    target_rooms = models.JSONField(default=list, verbose_name="대상 방 목록")
    language = models.CharField(max_length=5, default='ko', verbose_name="언어")
    auto_off = models.BooleanField(default=False, verbose_name="자동 끄기")
    scheduled_at = models.DateTimeField(verbose_name="예약 시간")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', verbose_name="상태")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="생성자")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    audio_file = models.ForeignKey(AudioFile, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="오디오 파일")

    class Meta:
        db_table = 'broadcast_schedule'
        verbose_name = "방송 예약"
        verbose_name_plural = "방송 예약"
        ordering = ['scheduled_at']

    def __str__(self):
        return f"{self.title} - {self.scheduled_at.strftime('%Y-%m-%d %H:%M')}"

class BroadcastPreview(models.Model):
    """방송 프리뷰를 관리하는 모델"""
    PREVIEW_STATUS_CHOICES = [
        ('pending', '대기중'),
        ('ready', '준비됨'),
        ('approved', '승인됨'),
        ('rejected', '거부됨'),
        ('expired', '만료됨'),
    ]

    preview_id = models.CharField(max_length=100, unique=True, verbose_name="프리뷰 ID")
    broadcast_type = models.CharField(max_length=10, choices=BroadcastHistory.BROADCAST_TYPE_CHOICES, verbose_name="방송 타입")
    content = models.TextField(verbose_name="방송 내용")
    target_rooms = models.JSONField(default=list, verbose_name="대상 방 목록")
    language = models.CharField(max_length=5, default='ko', verbose_name="언어")
    auto_off = models.BooleanField(default=False, verbose_name="자동 끄기")
    status = models.CharField(max_length=20, choices=PREVIEW_STATUS_CHOICES, default='pending', verbose_name="상태")
    audio_file = models.ForeignKey(AudioFile, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="프리뷰 오디오 파일")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="생성자")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_previews', verbose_name="승인자")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성일")
    expires_at = models.DateTimeField(verbose_name="만료일")
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="승인일")
    rejection_reason = models.TextField(blank=True, null=True, verbose_name="거부 사유")

    class Meta:
        db_table = 'broadcast_preview'
        verbose_name = "방송 프리뷰"
        verbose_name_plural = "방송 프리뷰"
        ordering = ['-created_at']

    def __str__(self):
        return f"프리뷰 {self.preview_id} - {self.get_broadcast_type_display()}"

    def save(self, *args, **kwargs):
        if not self.preview_id:
            # 프리뷰 ID 자동 생성
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            self.preview_id = f"preview_{timestamp}_{unique_id}"
        
        if not self.expires_at:
            # 기본적으로 1시간 후 만료
            import datetime
            from django.utils import timezone
            self.expires_at = timezone.now() + datetime.timedelta(hours=1)
        
        super().save(*args, **kwargs)

    def is_expired(self):
        """프리뷰가 만료되었는지 확인"""
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def get_preview_url(self):
        """프리뷰 오디오 파일 URL 반환"""
        if self.audio_file and self.audio_file.file:
            return f"/api/broadcast/preview/{self.preview_id}.mp3"
        return None

    def get_approval_endpoint(self):
        """승인 엔드포인트 URL 반환"""
        return f"/api/broadcast/approve/{self.preview_id}"
