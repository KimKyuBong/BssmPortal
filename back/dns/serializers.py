from rest_framework import serializers
from .models import CustomDnsRequest, CustomDnsRecord
from .utils import from_punycode

class CustomDnsRequestSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    original_domain = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomDnsRequest
        fields = '__all__'
    
    def get_original_domain(self, obj):
        """punycode를 원본 한글로 변환"""
        return from_punycode(obj.domain)

class CustomDnsRecordSerializer(serializers.ModelSerializer):
    original_domain = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomDnsRecord
        fields = '__all__'
    
    def get_original_domain(self, obj):
        """punycode를 원본 한글로 변환"""
        return from_punycode(obj.domain) 