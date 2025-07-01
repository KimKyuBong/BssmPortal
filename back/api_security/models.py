from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import pyotp
import secrets
import hashlib
import base64


class TOTPAPIKey(models.Model):
    """
    TOTP 기반 API 키 모델
    보안을 위해 다음 요소들을 포함합니다:
    - TOTP 시크릿 키 (암호화 저장)
    - API 키 해시 (원본 키는 저장하지 않음)
    - 만료 시간
    - 사용자별 권한
    - 사용 이력 추적
    """
    
    # 기본 정보
    name = models.CharField(max_length=100, verbose_name="API 키 이름")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='totp_api_keys', verbose_name="사용자")
    
    # 보안 정보 (암호화된 형태로 저장)
    totp_secret = models.CharField(max_length=255, verbose_name="TOTP 시크릿 키")
    api_key_hash = models.CharField(max_length=255, verbose_name="API 키 해시")
    salt = models.CharField(max_length=64, verbose_name="솔트")
    
    # 권한 및 제한
    permissions = models.JSONField(default=list, verbose_name="권한 목록")
    max_requests_per_minute = models.IntegerField(default=100, verbose_name="분당 최대 요청 수")
    max_requests_per_hour = models.IntegerField(default=1000, verbose_name="시간당 최대 요청 수")
    
    # 상태 및 만료
    is_active = models.BooleanField(default=True, verbose_name="활성 상태")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시간")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="만료 시간")
    last_used_at = models.DateTimeField(null=True, blank=True, verbose_name="마지막 사용 시간")
    
    # 사용 통계
    total_requests = models.IntegerField(default=0, verbose_name="총 요청 수")
    failed_attempts = models.IntegerField(default=0, verbose_name="실패 시도 수")
    
    class Meta:
        verbose_name = "TOTP API 키"
        verbose_name_plural = "TOTP API 키들"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
    @classmethod
    def generate_totp_secret(cls):
        """TOTP 시크릿 키 생성"""
        return pyotp.random_base32()
    
    @classmethod
    def generate_api_key(cls):
        """안전한 API 키 생성 (64바이트 랜덤)"""
        return secrets.token_urlsafe(64)
    
    @classmethod
    def hash_api_key(cls, api_key, salt):
        """API 키를 해시화"""
        return hashlib.sha256((api_key + salt).encode()).hexdigest()
    
    def generate_totp_code(self):
        """현재 시간에 대한 TOTP 코드 생성"""
        totp = pyotp.TOTP(self.totp_secret)
        return totp.now()
    
    def verify_totp_code(self, code, window=1):
        """TOTP 코드 검증"""
        totp = pyotp.TOTP(self.totp_secret)
        return totp.verify(code, valid_window=window)
    
    def is_expired(self):
        """만료 여부 확인"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    def can_make_request(self):
        """요청 가능 여부 확인"""
        if not self.is_active or self.is_expired():
            return False
        return True
    
    def increment_usage(self, success=True):
        """사용 통계 업데이트"""
        self.total_requests += 1
        if not success:
            self.failed_attempts += 1
        self.last_used_at = timezone.now()
        self.save(update_fields=['total_requests', 'failed_attempts', 'last_used_at'])


class APIKeyUsageLog(models.Model):
    """
    API 키 사용 로그
    보안 감사 및 모니터링을 위한 상세 로그
    """
    
    api_key = models.ForeignKey(TOTPAPIKey, on_delete=models.CASCADE, related_name='usage_logs', verbose_name="API 키")
    endpoint = models.CharField(max_length=255, verbose_name="엔드포인트")
    method = models.CharField(max_length=10, verbose_name="HTTP 메서드")
    ip_address = models.GenericIPAddressField(verbose_name="IP 주소")
    user_agent = models.TextField(blank=True, verbose_name="User Agent")
    status_code = models.IntegerField(verbose_name="응답 상태 코드")
    response_time = models.FloatField(verbose_name="응답 시간 (초)")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="요청 시간")
    success = models.BooleanField(verbose_name="성공 여부")
    error_message = models.TextField(blank=True, verbose_name="오류 메시지")
    
    class Meta:
        verbose_name = "API 키 사용 로그"
        verbose_name_plural = "API 키 사용 로그들"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['api_key', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.api_key.name} - {self.endpoint} ({self.timestamp})"


class SecurityPolicy(models.Model):
    """
    보안 정책 설정
    API 키 생성 및 사용에 대한 정책 관리
    """
    
    name = models.CharField(max_length=100, unique=True, verbose_name="정책 이름")
    description = models.TextField(blank=True, verbose_name="정책 설명")
    
    # TOTP 설정
    totp_interval = models.IntegerField(default=30, verbose_name="TOTP 간격 (초)")
    totp_digits = models.IntegerField(default=6, verbose_name="TOTP 자릿수")
    totp_window = models.IntegerField(default=1, verbose_name="TOTP 검증 윈도우")
    
    # API 키 설정
    default_key_length = models.IntegerField(default=64, verbose_name="기본 키 길이")
    max_keys_per_user = models.IntegerField(default=5, verbose_name="사용자당 최대 키 수")
    key_expiry_days = models.IntegerField(default=365, verbose_name="키 만료 일수")
    
    # 요청 제한
    default_rate_limit_per_minute = models.IntegerField(default=100, verbose_name="기본 분당 요청 제한")
    default_rate_limit_per_hour = models.IntegerField(default=1000, verbose_name="기본 시간당 요청 제한")
    
    # 보안 설정
    require_totp_for_sensitive_operations = models.BooleanField(default=True, verbose_name="민감한 작업에 TOTP 요구")
    log_all_requests = models.BooleanField(default=True, verbose_name="모든 요청 로깅")
    block_suspicious_ips = models.BooleanField(default=True, verbose_name="의심스러운 IP 차단")
    
    # 활성화 여부
    is_active = models.BooleanField(default=True, verbose_name="활성 상태")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시간")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정 시간")
    
    class Meta:
        verbose_name = "보안 정책"
        verbose_name_plural = "보안 정책들"
    
    def __str__(self):
        return self.name
    
    @classmethod
    def get_default_policy(cls):
        """기본 보안 정책 반환"""
        policy, created = cls.objects.get_or_create(
            name="기본 정책",
            defaults={
                'description': '기본 보안 정책',
                'totp_interval': 30,
                'totp_digits': 6,
                'totp_window': 1,
                'default_key_length': 64,
                'max_keys_per_user': 5,
                'key_expiry_days': 365,
                'default_rate_limit_per_minute': 100,
                'default_rate_limit_per_hour': 1000,
                'require_totp_for_sensitive_operations': True,
                'log_all_requests': True,
                'block_suspicious_ips': True,
            }
        )
        return policy
