from django.shortcuts import render
from rest_framework import generics, status, permissions, views, serializers
from rest_framework.response import Response
from .models import CustomDnsRequest, CustomDnsRecord, SslCertificate, CertificateAuthority
from .serializers import (
    CustomDnsRequestSerializer, CustomDnsRecordSerializer, SslCertificateSerializer, 
    CertificateAuthoritySerializer, CertificateGenerationRequestSerializer, CertificateFileSerializer
)
from .utils import apply_dns_records, to_punycode, validate_domain
from .ssl_utils import generate_ssl_certificate, revoke_ssl_certificate, check_expiring_certificates, renew_ssl_certificate
from django.utils import timezone
from django.db import models
import logging

logger = logging.getLogger(__name__)

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
            # DNS 레코드 생성 또는 업데이트
            dns_record, created = CustomDnsRecord.objects.update_or_create(
                domain=req.domain, 
                defaults={
                    'ip': req.ip, 
                    'user': req.user,
                    'ssl_enabled': req.ssl_enabled
                }
            )
            
            # SSL 인증서 발급이 요청된 경우
            if req.ssl_enabled:
                try:
                    ssl_cert = generate_ssl_certificate(req.domain, dns_record)
                    logger.info(f"SSL 인증서 발급 완료: {req.domain}")
                except Exception as e:
                    logger.error(f"SSL 인증서 발급 실패: {e}")
                    # SSL 발급 실패해도 DNS는 승인 상태 유지
                    
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
        dns_record = serializer.save(domain=converted_domain, user=self.request.user)
        
        # SSL이 활성화된 경우 인증서 발급
        if dns_record.ssl_enabled:
            try:
                generate_ssl_certificate(converted_domain, dns_record)
                logger.info(f"SSL 인증서 발급 완료: {converted_domain}")
            except Exception as e:
                logger.error(f"SSL 인증서 발급 실패: {e}")

class CustomDnsRecordUpdateView(generics.UpdateAPIView):
    queryset = CustomDnsRecord.objects.all()
    serializer_class = CustomDnsRecordSerializer
    permission_classes = [permissions.IsAdminUser]

    def perform_update(self, serializer):
        instance = self.get_object()
        old_ssl_enabled = instance.ssl_enabled
        
        # 도메인이 변경되는 경우에만 유효성 검증
        domain = serializer.validated_data.get('domain')
        if domain:
            is_valid, error_message = validate_domain(domain)
            if not is_valid:
                raise serializers.ValidationError({'domain': error_message})
            
            # 한글 도메인을 punycode로 변환하여 저장
            converted_domain = to_punycode(domain)
            dns_record = serializer.save(domain=converted_domain)
        else:
            dns_record = serializer.save()
        
        # SSL 설정 변경 처리
        new_ssl_enabled = dns_record.ssl_enabled
        
        if old_ssl_enabled and not new_ssl_enabled:
            # SSL 비활성화 - 기존 인증서 삭제
            try:
                if hasattr(dns_record, 'ssl_certificate'):
                    revoke_ssl_certificate(dns_record.ssl_certificate)
                    logger.info(f"SSL 인증서 삭제 완료: {dns_record.domain}")
            except Exception as e:
                logger.error(f"SSL 인증서 삭제 실패: {e}")
                
        elif not old_ssl_enabled and new_ssl_enabled:
            # SSL 활성화 - 새 인증서 발급
            try:
                generate_ssl_certificate(dns_record.domain, dns_record)
                logger.info(f"SSL 인증서 발급 완료: {dns_record.domain}")
            except Exception as e:
                logger.error(f"SSL 인증서 발급 실패: {e}")

class CustomDnsRecordDeleteView(generics.DestroyAPIView):
    queryset = CustomDnsRecord.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        domain = instance.domain
        
        # SSL 인증서가 있으면 삭제
        if hasattr(instance, 'ssl_certificate'):
            try:
                revoke_ssl_certificate(instance.ssl_certificate)
                logger.info(f"SSL 인증서 삭제 완료: {domain}")
            except Exception as e:
                logger.error(f"SSL 인증서 삭제 실패: {e}")
        
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
        
        # SSL 인증서가 있으면 삭제
        if hasattr(instance, 'ssl_certificate'):
            try:
                revoke_ssl_certificate(instance.ssl_certificate)
                logger.info(f"SSL 인증서 삭제 완료: {domain}")
            except Exception as e:
                logger.error(f"SSL 인증서 삭제 실패: {e}")
        
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
            logger.error(f"DNS 파일 적용 중 오류 발생: {e}")
        
        return Response({'message': '도메인이 삭제되고 DNS에 반영되었습니다.'}, status=status.HTTP_200_OK)

class ApplyDnsRecordsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        apply_dns_records()
        return Response({'result': '적용 완료'})

# SSL 관련 뷰들

class SslCertificateListView(generics.ListAPIView):
    """SSL 인증서 목록 조회"""
    queryset = SslCertificate.objects.all().order_by('-issued_at')
    serializer_class = SslCertificateSerializer
    permission_classes = [permissions.IsAdminUser]

class SslCertificateDetailView(generics.RetrieveAPIView):
    """SSL 인증서 상세 조회"""
    queryset = SslCertificate.objects.all()
    serializer_class = SslCertificateSerializer
    permission_classes = [permissions.IsAdminUser]

class SslCertificateRenewView(views.APIView):
    """SSL 인증서 갱신"""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, pk):
        try:
            ssl_cert = SslCertificate.objects.get(pk=pk)
            renewed_cert = renew_ssl_certificate(ssl_cert)
            serializer = SslCertificateSerializer(renewed_cert)
            return Response({
                'message': '인증서 갱신이 완료되었습니다.',
                'certificate': serializer.data
            })
        except SslCertificate.DoesNotExist:
            return Response({'error': '인증서를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"인증서 갱신 실패: {e}")
            return Response({'error': '인증서 갱신에 실패했습니다.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SslCertificateRevokeView(views.APIView):
    """SSL 인증서 취소"""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request, pk):
        try:
            ssl_cert = SslCertificate.objects.get(pk=pk)
            revoke_ssl_certificate(ssl_cert)
            return Response({'message': '인증서가 취소되었습니다.'})
        except SslCertificate.DoesNotExist:
            return Response({'error': '인증서를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"인증서 취소 실패: {e}")
            return Response({'error': '인증서 취소에 실패했습니다.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExpiringCertificatesView(views.APIView):
    """만료 예정 인증서 조회"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        days_threshold = int(request.query_params.get('days', 30))
        expiring_certs = check_expiring_certificates(days_threshold)
        serializer = SslCertificateSerializer(expiring_certs, many=True)
        return Response({
            'count': expiring_certs.count(),
            'certificates': serializer.data
        })

class CertificateAuthorityView(views.APIView):
    """CA 인증서 조회"""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        ca = CertificateAuthority.objects.filter(is_active=True).first()
        if ca:
            serializer = CertificateAuthoritySerializer(ca)
            return Response(serializer.data)
        else:
            return Response({'message': 'CA가 설정되지 않았습니다.'}, status=status.HTTP_404_NOT_FOUND)

class DownloadCaCertificateView(views.APIView):
    """CA 인증서 다운로드"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            ca = CertificateAuthority.objects.filter(is_active=True).first()
            if not ca:
                return Response({'error': 'CA 인증서를 찾을 수 없습니다.'}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            response = Response(ca.certificate, content_type='application/x-pem-file')
            response['Content-Disposition'] = 'attachment; filename="bssm_root_ca.crt"'
            return response
        except Exception as e:
            logger.error(f"CA 인증서 다운로드 실패: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateCertificateView(views.APIView):
    """DNS에 등록된 도메인으로 인증서 생성"""
    permission_classes = [permissions.IsAuthenticated]

    def _check_domain_ownership(self, user, domain):
        """도메인 소유권 확인"""
        # 관리자는 모든 도메인에 대해 인증서 발급 가능
        if user.is_staff or user.is_superuser:
            return True, None
            
        # 일반 사용자는 본인이 소유한 도메인만 가능
        try:
            dns_record = CustomDnsRecord.objects.get(domain=domain)
            
            # 1. DNS 레코드의 소유자가 본인인지 확인
            if dns_record.user == user:
                return True, None
                
            # 2. DNS 레코드의 IP가 본인 소유 장비의 IP인지 확인
            from devices.models import Device
            user_ips = Device.objects.filter(user=user).values_list('assigned_ip', flat=True)
            if dns_record.ip in user_ips:
                return True, None
                
            return False, "해당 도메인에 대한 권한이 없습니다."
            
        except CustomDnsRecord.DoesNotExist:
            return False, "등록되지 않은 도메인입니다."

    def post(self, request):
        serializer = CertificateGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        domain = serializer.validated_data['domain']
        
        try:
            # 한글 도메인을 punycode로 변환
            converted_domain = to_punycode(domain)
            
            # 도메인 소유권 확인
            has_permission, error_message = self._check_domain_ownership(request.user, converted_domain)
            if not has_permission:
                return Response({'error': error_message}, status=status.HTTP_403_FORBIDDEN)
            
            # DNS 레코드 조회
            dns_record = CustomDnsRecord.objects.get(domain=converted_domain)
            
            # 기존 인증서가 있는지 확인
            existing_cert = None
            if hasattr(dns_record, 'ssl_certificate'):
                existing_cert = dns_record.ssl_certificate
                # 기존 인증서가 만료되지 않았다면 재사용
                if not existing_cert.is_expired() and existing_cert.status == '활성':
                    logger.info(f"기존 인증서 재사용: {converted_domain}")
                else:
                    # 만료된 인증서는 삭제
                    existing_cert.delete()
                    existing_cert = None
            
            # 새 인증서 생성
            if not existing_cert:
                ssl_cert = generate_ssl_certificate(converted_domain, dns_record)
                logger.info(f"새 인증서 생성 완료: {converted_domain}")
            else:
                ssl_cert = existing_cert
            
            # CA 인증서 조회
            ca = CertificateAuthority.objects.filter(is_active=True).first()
            if not ca:
                return Response({'error': 'CA 인증서를 찾을 수 없습니다.'}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            # 응답 데이터 구성
            response_data = {
                'domain': domain,  # 원본 도메인 반환
                'certificate': ssl_cert.certificate,
                'private_key': ssl_cert.private_key,
                'certificate_chain': ssl_cert.certificate_chain or '',
                'ca_certificate': ca.certificate,
                'expires_at': ssl_cert.expires_at,
                'issued_at': ssl_cert.issued_at
            }
            
            response_serializer = CertificateFileSerializer(response_data)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
            
        except CustomDnsRecord.DoesNotExist:
            return Response({'error': '등록되지 않은 도메인입니다.'}, 
                          status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"인증서 생성 실패: {e}")
            return Response({'error': f'인증서 생성 중 오류가 발생했습니다: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MyDnsRecordsView(generics.ListAPIView):
    """사용자가 소유한 DNS 레코드 목록 조회"""
    serializer_class = CustomDnsRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # 관리자는 모든 DNS 레코드 조회 가능
        if user.is_staff or user.is_superuser:
            return CustomDnsRecord.objects.all().order_by('-created_at')
        
        # 일반 사용자는 본인 소유 DNS 레코드만 조회
        from devices.models import Device
        user_ips = Device.objects.filter(user=user).values_list('assigned_ip', flat=True)
        
        return CustomDnsRecord.objects.filter(
            models.Q(user=user) | models.Q(ip__in=user_ips)
        ).order_by('-created_at')
