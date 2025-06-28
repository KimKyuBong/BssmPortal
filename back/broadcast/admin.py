from django.contrib import admin
from .models import DeviceMatrix, BroadcastHistory, AudioFile, BroadcastSchedule, BroadcastPreview

@admin.register(DeviceMatrix)
class DeviceMatrixAdmin(admin.ModelAdmin):
    """장치 매트릭스 관리"""
    list_display = ['device_name', 'room_id', 'matrix_row', 'matrix_col', 'is_active', 'created_at']
    list_filter = ['is_active', 'matrix_row', 'matrix_col']
    search_fields = ['device_name', 'room_id']
    ordering = ['matrix_row', 'matrix_col']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('device_name', 'room_id', 'is_active')
        }),
        ('위치 정보', {
            'fields': ('position_row', 'position_col', 'matrix_row', 'matrix_col')
        }),
        ('시스템 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(BroadcastHistory)
class BroadcastHistoryAdmin(admin.ModelAdmin):
    """방송 이력 관리"""
    list_display = ['broadcast_type', 'content_short', 'broadcasted_by', 'status', 'created_at']
    list_filter = ['broadcast_type', 'status', 'language', 'auto_off', 'created_at']
    search_fields = ['content', 'broadcasted_by__username']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'completed_at']
    
    def content_short(self, obj):
        """내용을 짧게 표시"""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_short.short_description = '방송 내용'
    
    fieldsets = (
        ('방송 정보', {
            'fields': ('broadcast_type', 'content', 'language', 'auto_off')
        }),
        ('대상 정보', {
            'fields': ('target_rooms',)
        }),
        ('상태 정보', {
            'fields': ('status', 'error_message')
        }),
        ('사용자 정보', {
            'fields': ('broadcasted_by',)
        }),
        ('시간 정보', {
            'fields': ('created_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(AudioFile)
class AudioFileAdmin(admin.ModelAdmin):
    """오디오 파일 관리"""
    list_display = ['original_filename', 'file_size_mb', 'uploaded_by', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['original_filename', 'uploaded_by__username']
    ordering = ['-created_at']
    readonly_fields = ['file_size', 'created_at']
    
    def file_size_mb(self, obj):
        """파일 크기를 MB 단위로 표시"""
        return f"{obj.get_file_size_mb()} MB"
    file_size_mb.short_description = '파일 크기'
    
    fieldsets = (
        ('파일 정보', {
            'fields': ('file', 'original_filename', 'file_size')
        }),
        ('메타데이터', {
            'fields': ('duration', 'is_active')
        }),
        ('사용자 정보', {
            'fields': ('uploaded_by',)
        }),
        ('시간 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

@admin.register(BroadcastSchedule)
class BroadcastScheduleAdmin(admin.ModelAdmin):
    """방송 예약 관리"""
    list_display = ['title', 'broadcast_type', 'scheduled_at', 'status', 'created_by', 'created_at']
    list_filter = ['broadcast_type', 'status', 'language', 'auto_off', 'scheduled_at']
    search_fields = ['title', 'content', 'created_by__username']
    ordering = ['scheduled_at']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('예약 정보', {
            'fields': ('title', 'broadcast_type', 'content', 'scheduled_at')
        }),
        ('방송 설정', {
            'fields': ('target_rooms', 'language', 'auto_off')
        }),
        ('파일 정보', {
            'fields': ('audio_file',),
            'classes': ('collapse',)
        }),
        ('상태 정보', {
            'fields': ('status',)
        }),
        ('사용자 정보', {
            'fields': ('created_by',)
        }),
        ('시간 정보', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

@admin.register(BroadcastPreview)
class BroadcastPreviewAdmin(admin.ModelAdmin):
    """방송 프리뷰 관리"""
    list_display = ['preview_id', 'broadcast_type', 'status', 'created_by', 'created_at', 'expires_at']
    list_filter = ['broadcast_type', 'status', 'language', 'auto_off', 'created_at']
    search_fields = ['preview_id', 'content', 'created_by__username']
    ordering = ['-created_at']
    readonly_fields = ['preview_id', 'created_at', 'expires_at', 'approved_at']
    
    fieldsets = (
        ('프리뷰 정보', {
            'fields': ('preview_id', 'broadcast_type', 'content', 'status')
        }),
        ('방송 설정', {
            'fields': ('target_rooms', 'language', 'auto_off')
        }),
        ('파일 정보', {
            'fields': ('audio_file',),
            'classes': ('collapse',)
        }),
        ('승인 정보', {
            'fields': ('approved_by', 'approved_at', 'rejection_reason'),
            'classes': ('collapse',)
        }),
        ('시간 정보', {
            'fields': ('created_at', 'expires_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """만료된 프리뷰 자동 업데이트"""
        from django.utils import timezone
        # 만료된 프리뷰들 자동으로 만료 상태로 변경
        BroadcastPreview.objects.filter(
            status__in=['pending', 'ready'],
            expires_at__lt=timezone.now()
        ).update(status='expired')
        return super().get_queryset(request)
