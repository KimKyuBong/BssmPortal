from django.contrib import admin
from .models import CustomDnsRequest, CustomDnsRecord, SslCertificate, CertificateAuthority

# Register your models here.

@admin.register(CustomDnsRequest)
class CustomDnsRequestAdmin(admin.ModelAdmin):
    list_display = ['domain', 'ip', 'user', 'status', 'ssl_enabled', 'created_at', 'processed_at']
    list_filter = ['status', 'ssl_enabled', 'created_at']
    search_fields = ['domain', 'ip', 'user__username', 'user__name']
    readonly_fields = ['created_at', 'processed_at']
    ordering = ['-created_at']

@admin.register(CustomDnsRecord)
class CustomDnsRecordAdmin(admin.ModelAdmin):
    list_display = ['domain', 'ip', 'user', 'ssl_enabled', 'created_at']
    list_filter = ['ssl_enabled', 'created_at']
    search_fields = ['domain', 'ip', 'user__username', 'user__name']
    readonly_fields = ['created_at']
    ordering = ['-created_at']

@admin.register(SslCertificate)
class SslCertificateAdmin(admin.ModelAdmin):
    list_display = ['domain', 'status', 'issued_at', 'expires_at', 'days_until_expiry']
    list_filter = ['status', 'issued_at', 'expires_at']
    search_fields = ['domain']
    readonly_fields = ['issued_at', 'days_until_expiry', 'is_expired']
    ordering = ['-issued_at']
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # 수정 시
            return self.readonly_fields + ['dns_record', 'domain', 'certificate', 'private_key', 'certificate_chain']
        return self.readonly_fields

@admin.register(CertificateAuthority)
class CertificateAuthorityAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at']
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # 수정 시
            return self.readonly_fields + ['certificate', 'private_key']
        return self.readonly_fields
