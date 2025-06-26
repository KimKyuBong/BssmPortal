from rest_framework import serializers
from .models import CustomDnsRequest, CustomDnsRecord, SslCertificate, CertificateAuthority

class CustomDnsRequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = CustomDnsRequest
        fields = ['id', 'domain', 'ip', 'reason', 'status', 'reject_reason', 'ssl_enabled', 'created_at', 'processed_at', 'user_name']
        read_only_fields = ['status', 'reject_reason', 'created_at', 'processed_at', 'user_name']

class SslCertificateSerializer(serializers.ModelSerializer):
    days_until_expiry = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = SslCertificate
        fields = ['id', 'domain', 'status', 'issued_at', 'expires_at', 'days_until_expiry', 'is_expired']
        read_only_fields = ['id', 'domain', 'status', 'issued_at', 'expires_at', 'days_until_expiry', 'is_expired']

class CustomDnsRecordSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    ssl_certificate = SslCertificateSerializer(read_only=True)
    
    class Meta:
        model = CustomDnsRecord
        fields = ['id', 'domain', 'ip', 'ssl_enabled', 'created_at', 'user_name', 'ssl_certificate']
        read_only_fields = ['created_at', 'user_name', 'ssl_certificate']

class CertificateAuthoritySerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificateAuthority
        fields = ['id', 'name', 'certificate', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'private_key': {'write_only': True}  # 개인키는 반환하지 않음
        } 