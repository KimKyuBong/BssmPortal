from django.db import models
from django.conf import settings

# Create your models here.

class CustomDnsRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', '대기'),
        ('approved', '승인'),
        ('rejected', '거절'),
        ('deleted', '삭제됨'),  # 승인 후 도메인이 삭제된 경우
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    domain = models.CharField(max_length=255)
    ip = models.GenericIPAddressField()
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    reject_reason = models.TextField(blank=True, null=True)
    ssl_enabled = models.BooleanField(default=False, verbose_name='SSL 인증서 발급')
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        verbose_name = '커스텀 DNS 요청'
        verbose_name_plural = '커스텀 DNS 요청 목록'
        db_table = 'custom_dns_requests'

class CustomDnsRecord(models.Model):
    domain = models.CharField(max_length=255, unique=True)
    ip = models.GenericIPAddressField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    ssl_enabled = models.BooleanField(default=False, verbose_name='SSL 활성화')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '커스텀 DNS 레코드'
        verbose_name_plural = '커스텀 DNS 레코드 목록'
        db_table = 'custom_dns_records'

class SslCertificate(models.Model):
    STATUS_CHOICES = (
        ('발급중', '발급중'),
        ('활성', '활성'),
        ('만료', '만료'),
        ('오류', '오류'),
    )
    
    dns_record = models.OneToOneField(CustomDnsRecord, on_delete=models.CASCADE, related_name='ssl_certificate')
    domain = models.CharField(max_length=255)
    certificate = models.TextField(verbose_name='인증서 (PEM 형식)')
    certificate_chain = models.TextField(blank=True, null=True, verbose_name='인증서 체인')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='발급중')
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        verbose_name = 'SSL 인증서'
        verbose_name_plural = 'SSL 인증서 목록'
        db_table = 'ssl_certificates'
        
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at
        
    def days_until_expiry(self):
        from django.utils import timezone
        delta = self.expires_at - timezone.now()
        return delta.days if delta.days > 0 else 0

class CertificateAuthority(models.Model):
    """내부 CA 정보"""
    name = models.CharField(max_length=100, unique=True, verbose_name='CA 이름')
    certificate = models.TextField(verbose_name='CA 인증서 (PEM 형식)')
    private_key = models.TextField(verbose_name='CA 개인키 (PEM 형식)')
    is_active = models.BooleanField(default=True, verbose_name='활성화')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '인증 기관'
        verbose_name_plural = '인증 기관 목록'
        db_table = 'certificate_authorities'
