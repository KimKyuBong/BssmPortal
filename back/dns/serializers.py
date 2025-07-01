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

class CertificateGenerationRequestSerializer(serializers.Serializer):
    """인증서 생성 요청 시리얼라이저"""
    domain = serializers.CharField(max_length=255, help_text="인증서를 생성할 도메인명")
    
    def validate_domain(self, value):
        """도메인 유효성 검증"""
        from .utils import validate_domain
        is_valid, error_message = validate_domain(value)
        if not is_valid:
            raise serializers.ValidationError(error_message)
        return value

class CertificateFileSerializer(serializers.Serializer):
    """인증서 파일 응답 시리얼라이저 (개인키는 포함하지 않음)"""
    domain = serializers.CharField()
    certificate = serializers.CharField(help_text="인증서 PEM 파일 내용")
    certificate_chain = serializers.CharField(help_text="인증서 체인 PEM 파일 내용", allow_blank=True)
    ca_certificate = serializers.CharField(help_text="CA 인증서 PEM 파일 내용")
    expires_at = serializers.DateTimeField(help_text="만료일시")
    issued_at = serializers.DateTimeField(help_text="발급일시") 