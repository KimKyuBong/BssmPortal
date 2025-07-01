from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import TOTPAPIKey, APIKeyUsageLog, SecurityPolicy


@admin.register(TOTPAPIKey)
class TOTPAPIKeyAdmin(admin.ModelAdmin):
    """TOTP API 키 관리"""
    
    list_display = [
        'name', 'user', 'is_active', 'is_expired_display', 'total_requests', 
        'failed_attempts', 'created_at', 'expires_at'
    ]
    list_filter = ['is_active', 'created_at', 'expires_at', 'user']
    search_fields = ['name', 'user__username', 'user__email']
    readonly_fields = [
        'totp_secret', 'api_key_hash', 'salt', 'created_at', 'last_used_at',
        'total_requests', 'failed_attempts', 'qr_code_display'
    ]
    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'user', 'is_active')
        }),
        ('보안 정보', {
            'fields': ('totp_secret', 'api_key_hash', 'salt', 'qr_code_display'),
            'classes': ('collapse',)
        }),
        ('권한 및 제한', {
            'fields': ('permissions', 'max_requests_per_minute', 'max_requests_per_hour')
        }),
        ('만료 설정', {
            'fields': ('expires_at',)
        }),
        ('사용 통계', {
            'fields': ('total_requests', 'failed_attempts', 'last_used_at', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def is_expired_display(self, obj):
        """만료 여부 표시"""
        if obj.is_expired():
            return format_html('<span style="color: red;">만료됨</span>')
        return format_html('<span style="color: green;">유효함</span>')
    is_expired_display.short_description = '만료 상태'
    
    def qr_code_display(self, obj):
        """QR 코드 표시"""
        try:
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
            
            return format_html(
                '<img src="data:image/png;base64,{}" style="max-width: 200px;" />',
                img_str
            )
        except ImportError:
            return "qrcode 패키지가 설치되지 않았습니다."
    
    qr_code_display.short_description = 'TOTP QR 코드'
    
    def get_queryset(self, request):
        """관리자용 쿼리셋"""
        return super().get_queryset(request).select_related('user')
    
    actions = ['activate_keys', 'deactivate_keys', 'reset_usage_stats']
    
    def activate_keys(self, request, queryset):
        """선택된 키들을 활성화"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated}개의 API 키가 활성화되었습니다.')
    activate_keys.short_description = "선택된 API 키들을 활성화"
    
    def deactivate_keys(self, request, queryset):
        """선택된 키들을 비활성화"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated}개의 API 키가 비활성화되었습니다.')
    deactivate_keys.short_description = "선택된 API 키들을 비활성화"
    
    def reset_usage_stats(self, request, queryset):
        """사용 통계 초기화"""
        updated = queryset.update(total_requests=0, failed_attempts=0)
        self.message_user(request, f'{updated}개의 API 키의 사용 통계가 초기화되었습니다.')
    reset_usage_stats.short_description = "선택된 API 키들의 사용 통계 초기화"


@admin.register(APIKeyUsageLog)
class APIKeyUsageLogAdmin(admin.ModelAdmin):
    """API 키 사용 로그 관리"""
    
    list_display = [
        'api_key_name', 'user_username', 'endpoint', 'method', 'status_code',
        'success', 'response_time', 'timestamp'
    ]
    list_filter = [
        'success', 'method', 'status_code', 'timestamp', 'api_key__user'
    ]
    search_fields = [
        'api_key__name', 'api_key__user__username', 'endpoint', 'ip_address'
    ]
    readonly_fields = [
        'api_key', 'endpoint', 'method', 'ip_address', 'user_agent',
        'status_code', 'response_time', 'timestamp', 'success', 'error_message'
    ]
    date_hierarchy = 'timestamp'
    
    def api_key_name(self, obj):
        return obj.api_key.name
    api_key_name.short_description = 'API 키 이름'
    
    def user_username(self, obj):
        return obj.api_key.user.username
    user_username.short_description = '사용자'
    
    def get_queryset(self, request):
        """관리자용 쿼리셋"""
        return super().get_queryset(request).select_related('api_key__user')
    
    def has_add_permission(self, request):
        """추가 권한 비활성화"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """수정 권한 비활성화"""
        return False
    
    actions = ['delete_old_logs']
    
    def delete_old_logs(self, request, queryset):
        """오래된 로그 삭제"""
        from django.utils import timezone
        from datetime import timedelta
        
        # 30일 이전 로그 삭제
        cutoff_date = timezone.now() - timedelta(days=30)
        deleted_count, _ = APIKeyUsageLog.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()
        
        self.message_user(request, f'{deleted_count}개의 오래된 로그가 삭제되었습니다.')
    delete_old_logs.short_description = "30일 이전 로그 삭제"


@admin.register(SecurityPolicy)
class SecurityPolicyAdmin(admin.ModelAdmin):
    """보안 정책 관리"""
    
    list_display = ['name', 'is_active', 'totp_interval', 'totp_digits', 'max_keys_per_user', 'updated_at']
    list_filter = ['is_active', 'require_totp_for_sensitive_operations', 'log_all_requests', 'block_suspicious_ips']
    search_fields = ['name', 'description']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('TOTP 설정', {
            'fields': ('totp_interval', 'totp_digits', 'totp_window')
        }),
        ('API 키 설정', {
            'fields': ('default_key_length', 'max_keys_per_user', 'key_expiry_days')
        }),
        ('요청 제한', {
            'fields': ('default_rate_limit_per_minute', 'default_rate_limit_per_hour')
        }),
        ('보안 설정', {
            'fields': (
                'require_totp_for_sensitive_operations', 
                'log_all_requests', 
                'block_suspicious_ips'
            )
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """기본 정책은 수정 불가"""
        if obj and obj.name == "기본 정책":
            return ['name']
        return []
