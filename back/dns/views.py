from django.shortcuts import render
from rest_framework import generics, status, permissions, views, serializers
from rest_framework.response import Response
from .models import CustomDnsRequest, CustomDnsRecord
from .serializers import CustomDnsRequestSerializer, CustomDnsRecordSerializer
from .utils import apply_dns_records, to_punycode, validate_domain
from django.utils import timezone
from django.db import models

# Create your views here.

class CustomDnsRequestCreateView(generics.CreateAPIView):
    serializer_class = CustomDnsRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # 도메인 유효성 검증
        domain = serializer.validated_data.get('domain', '')
        is_valid, error_message = validate_domain(domain)
        if not is_valid:
            raise serializers.ValidationError({'domain': error_message})
        
        # 한글 도메인을 punycode로 변환하여 저장
        converted_domain = to_punycode(domain)
        serializer.save(user=self.request.user, domain=converted_domain)

class CustomDnsRequestListView(generics.ListAPIView):
    queryset = CustomDnsRequest.objects.all().order_by('-created_at')
    serializer_class = CustomDnsRequestSerializer
    permission_classes = [permissions.IsAdminUser]

class MyDnsRequestListView(generics.ListAPIView):
    """사용자가 자신의 DNS 요청을 조회하는 뷰"""
    serializer_class = CustomDnsRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CustomDnsRequest.objects.filter(user=self.request.user).order_by('-created_at')

class CustomDnsRequestApproveView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        req = CustomDnsRequest.objects.get(pk=pk)
        action = request.data.get('action')
        reason = request.data.get('reason', '')
        req.processed_at = timezone.now()
        if action == '승인':
            req.status = '승인'
            # 도메인이 이미 punycode로 변환되어 저장되었으므로 그대로 사용
            CustomDnsRecord.objects.update_or_create(domain=req.domain, defaults={'ip': req.ip, 'user': req.user})
        elif action == '거절':
            req.status = '거절'
            req.reject_reason = reason
        req.save()
        return Response({'status': req.status})

class CustomDnsRecordListView(generics.ListAPIView):
    queryset = CustomDnsRecord.objects.all().order_by('-created_at')
    serializer_class = CustomDnsRecordSerializer
    permission_classes = [permissions.IsAdminUser]

class CustomDnsRecordCreateView(generics.CreateAPIView):
    serializer_class = CustomDnsRecordSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_create(self, serializer):
        # 도메인 유효성 검증
        domain = serializer.validated_data.get('domain', '')
        is_valid, error_message = validate_domain(domain)
        if not is_valid:
            raise serializers.ValidationError({'domain': error_message})
        
        # 한글 도메인을 punycode로 변환하여 저장
        converted_domain = to_punycode(domain)
        serializer.save(domain=converted_domain, user=self.request.user)

class CustomDnsRecordUpdateView(generics.UpdateAPIView):
    queryset = CustomDnsRecord.objects.all()
    serializer_class = CustomDnsRecordSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_update(self, serializer):
        # 도메인이 변경되는 경우에만 유효성 검증
        domain = serializer.validated_data.get('domain')
        if domain:
            is_valid, error_message = validate_domain(domain)
            if not is_valid:
                raise serializers.ValidationError({'domain': error_message})
            
            # 한글 도메인을 punycode로 변환하여 저장
            converted_domain = to_punycode(domain)
            serializer.save(domain=converted_domain)
        else:
            serializer.save()

class CustomDnsRecordDeleteView(generics.DestroyAPIView):
    queryset = CustomDnsRecord.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        domain = instance.domain
        
        # 해당 도메인의 승인된 신청들을 "삭제됨" 상태로 변경
        CustomDnsRequest.objects.filter(
            domain=domain, 
            status='승인'
        ).update(
            status='삭제됨',
            processed_at=timezone.now()
        )
        
        instance.delete()
        return Response({'message': '도메인이 삭제되었습니다.'}, status=status.HTTP_200_OK)

class CustomDnsRequestDeleteView(generics.DestroyAPIView):
    queryset = CustomDnsRequest.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({'message': '신청이 삭제되었습니다.'}, status=status.HTTP_200_OK)

class MyDnsRecordDeleteView(generics.DestroyAPIView):
    """사용자가 자신의 DNS 레코드를 삭제하는 뷰"""
    queryset = CustomDnsRecord.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # 사용자가 소유한 DNS 레코드 또는 사용자가 소유한 IP의 DNS 레코드를 반환
        from devices.models import Device
        user_ips = Device.objects.filter(user=self.request.user).values_list('assigned_ip', flat=True)
        return CustomDnsRecord.objects.filter(
            models.Q(user=self.request.user) | models.Q(ip__in=user_ips)
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        domain = instance.domain
        
        # 해당 도메인의 승인된 신청들을 "삭제됨" 상태로 변경
        CustomDnsRequest.objects.filter(
            domain=domain, 
            status='승인',
            user=request.user
        ).update(
            status='삭제됨',
            processed_at=timezone.now()
        )
        
        # 데이터베이스에서 삭제
        instance.delete()
        
        # DNS 파일에 즉시 반영
        try:
            apply_dns_records()
        except Exception as e:
            # DNS 파일 적용 실패 시 로그만 남기고 계속 진행
            print(f"DNS 파일 적용 중 오류 발생: {e}")
        
        return Response({'message': '도메인이 삭제되고 DNS에 반영되었습니다.'}, status=status.HTTP_200_OK)

class ApplyDnsRecordsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        apply_dns_records()
        return Response({'result': '적용 완료'})
