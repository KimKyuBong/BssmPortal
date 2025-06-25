from django.db import models
from django.conf import settings

# Create your models here.

class CustomDnsRequest(models.Model):
    STATUS_CHOICES = (
        ('대기', '대기'),
        ('승인', '승인'),
        ('거절', '거절'),
        ('삭제됨', '삭제됨'),  # 승인 후 도메인이 삭제된 경우
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    domain = models.CharField(max_length=255)
    ip = models.GenericIPAddressField()
    reason = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='대기')
    reject_reason = models.TextField(blank=True, null=True)
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
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = '커스텀 DNS 레코드'
        verbose_name_plural = '커스텀 DNS 레코드 목록'
        db_table = 'custom_dns_records'
