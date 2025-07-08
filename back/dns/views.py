from django.shortcuts import render
from rest_framework import generics, status, permissions, views, serializers
from rest_framework.response import Response
from .models import CustomDnsRequest, CustomDnsRecord, SslCertificate, CertificateAuthority
from .serializers import (
    CustomDnsRequestSerializer, CustomDnsRecordSerializer, SslCertificateSerializer, 
    CertificateAuthoritySerializer, CertificateGenerationRequestSerializer, CertificateFileSerializer
)
from .utils import apply_dns_records, to_punycode, validate_domain
from .ssl_utils import generate_ssl_certificate, revoke_ssl_certificate, check_expiring_certificates, renew_ssl_certificate, create_ssl_package
from django.utils import timezone
from django.db import models
import logging
import os
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from core.permissions import DnsPermissions, IsAdminUser, IsAuthenticatedUser

# OCSP 관련 import 추가
from cryptography import x509
from cryptography.x509.ocsp import (
    load_der_ocsp_request, OCSPResponseBuilder, OCSPCertStatus
)
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa
import base64

logger = logging.getLogger(__name__)

# Create your views here.

class CustomDnsRequestCreateView(generics.CreateAPIView):
    serializer_class = CustomDnsRequestSerializer
    permission_classes = [DnsPermissions]  # 중앙화된 권한 관리 사용

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
    permission_classes = [DnsPermissions]  # 중앙화된 권한 관리 사용

class MyDnsRequestListView(generics.ListAPIView):
    """사용자가 자신의 DNS 요청을 조회하는 뷰"""
    serializer_class = CustomDnsRequestSerializer
    permission_classes = [DnsPermissions]  # 중앙화된 권한 관리 사용

    def get_queryset(self):
        return CustomDnsRequest.objects.filter(user=self.request.user).order_by('-created_at')

class CustomDnsRequestApproveView(views.APIView):
    permission_classes = [DnsPermissions]  # 중앙화된 권한 관리 사용

    def post(self, request, pk):
        req = CustomDnsRequest.objects.get(pk=pk)
        action = request.data.get('action')
        reason = request.data.get('reason', '')
        req.processed_at = timezone.now()
        
        if action == 'approved':
            req.status = 'approved'
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
                    
        elif action == 'rejected':
            req.status = 'rejected'
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
            status='approved'
        ).update(
            status='deleted',
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
            status='approved',
            user=request.user
        ).update(
            status='deleted',
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
        result = apply_dns_records()
        return Response(result)

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
    permission_classes = [permissions.AllowAny]  # 로그인하지 않은 사용자도 다운로드 가능

    def get(self, request):
        try:
            # 마운트된 SSL 디렉토리에서 CA 인증서 파일 찾기
            ssl_ca_dir = getattr(settings, 'SSL_CA_DIR', '/etc/ssl/ca')
            
            # 실제 존재하는 파일명들 확인
            possible_ca_files = [
                'bssm_internal_ca.crt',
                'ca.crt'
            ]
            
            ca_cert_path = None
            for filename in possible_ca_files:
                test_path = os.path.join(ssl_ca_dir, filename)
                if os.path.exists(test_path):
                    ca_cert_path = test_path
                    break
            
            # 파일이 존재하는지 확인
            if not ca_cert_path:
                logger.error(f"CA 인증서 파일을 찾을 수 없습니다. 검색 경로: {ssl_ca_dir}")
                return Response({'error': 'CA 인증서 파일을 찾을 수 없습니다.'}, 
                              status=status.HTTP_404_NOT_FOUND)
            
            # 파일 내용이 올바른 PEM 형식인지 확인
            try:
                with open(ca_cert_path, 'r') as f:
                    certificate_content = f.read().strip()
                
                if not certificate_content.startswith('-----BEGIN CERTIFICATE-----'):
                    logger.error("CA 인증서가 올바른 PEM 형식이 아닙니다.")
                    return Response({'error': 'CA 인증서 형식이 올바르지 않습니다.'}, 
                                  status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                # 파일 응답으로 직접 제공
                response = FileResponse(
                    open(ca_cert_path, 'rb'),
                    content_type='application/x-pem-certificate'
                )
                response['Content-Disposition'] = 'attachment; filename="bssm_internal_ca.crt"'
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
                return response
                
            except Exception as e:
                logger.error(f"CA 인증서 파일 읽기 실패: {e}")
                return Response({'error': 'CA 인증서 파일을 읽을 수 없습니다.'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"CA 인증서 다운로드 실패: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DownloadDomainCertificateView(views.APIView):
    """도메인별 SSL 인증서 다운로드"""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, domain):
        try:
            # 한글 도메인을 punycode로 변환
            converted_domain = to_punycode(domain)
            
            # DNS 레코드 조회
            dns_record = CustomDnsRecord.objects.get(domain=converted_domain)
            
            # SSL 인증서 확인 및 생성
            ssl_cert = None
            if hasattr(dns_record, 'ssl_certificate') and dns_record.ssl_certificate:
                ssl_cert = dns_record.ssl_certificate
                # 기존 인증서가 만료되지 않았다면 재사용
                if ssl_cert.is_expired() or ssl_cert.status != '활성':
                    # 만료된 인증서는 삭제하고 새로 생성
                    ssl_cert.delete()
                    ssl_cert = None
            
            # SSL 인증서가 없으면 생성
            if not ssl_cert:
                try:
                    ssl_cert = generate_ssl_certificate(converted_domain, dns_record)
                    logger.info(f"SSL 인증서 자동 생성 완료: {converted_domain}")
                except Exception as e:
                    logger.error(f"SSL 인증서 생성 실패 ({converted_domain}): {e}")
                    return Response({'error': f'SSL 인증서 생성에 실패했습니다: {str(e)}'}, 
                                  status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # 인증서 내용이 올바른 PEM 형식인지 확인
            certificate_content = ssl_cert.certificate.strip()
            if not certificate_content.startswith('-----BEGIN CERTIFICATE-----'):
                logger.error(f"도메인 인증서가 올바른 PEM 형식이 아닙니다: {converted_domain}")
                return Response({'error': '인증서 형식이 올바르지 않습니다.'}, 
                              status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # 표준 MIME 타입 사용
            response = Response(certificate_content, content_type='application/x-pem-certificate')
            response['Content-Disposition'] = f'attachment; filename="{domain}_ssl_certificate.crt"'
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return response
            
        except CustomDnsRecord.DoesNotExist:
            return Response({'error': '등록되지 않은 도메인입니다.'}, 
                          status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"도메인 인증서 다운로드 실패 ({domain}): {e}")
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
            
            # 응답 데이터 구성 (개인키는 포함하지 않음)
            response_data = {
                'domain': domain,  # 원본 도메인 반환
                'certificate': ssl_cert.certificate,
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

class DownloadSslPackageView(views.APIView):
    """원클릭 SSL 패키지 다운로드 (인증서 + 개인키 + CA + 설정파일)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, domain):
        try:
            # 한글 도메인을 punycode로 변환
            converted_domain = to_punycode(domain)
            
            # DNS 레코드 조회
            dns_record = CustomDnsRecord.objects.get(domain=converted_domain)
            
            # SSL 패키지 생성
            zip_data = create_ssl_package(converted_domain, dns_record)
            
            # HttpResponse를 사용하여 바이너리 데이터 직접 반환
            response = HttpResponse(zip_data, content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{domain}_ssl_package.zip"'
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return response
            
        except CustomDnsRecord.DoesNotExist:
            return Response({'error': '등록되지 않은 도메인입니다.'}, 
                          status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"SSL 패키지 다운로드 실패 ({domain}): {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OCSPView(views.APIView):
    """OCSP 서버 - 인증서 상태 확인"""
    permission_classes = [permissions.AllowAny]  # OCSP는 인증 불필요
    
    def post(self, request):
        """OCSP 요청 처리"""
        try:
            # 1. OCSP 요청 파싱
            ocsp_req = load_der_ocsp_request(request.body)
            serial_number = ocsp_req.serial_number
            
            logger.info(f"OCSP 요청 수신: 시리얼 번호 {serial_number}")
            
            # 2. 인증서 상태 확인
            try:
                cert = SslCertificate.objects.get(serial_number=str(serial_number))
                
                if cert.is_revoked():
                    cert_status = OCSPCertStatus.REVOKED
                    revocation_time = cert.revoked_at
                    revocation_reason = x509.ReasonFlags.unspecified
                    logger.info(f"인증서 폐기됨: {cert.domain}")
                elif cert.is_expired():
                    cert_status = OCSPCertStatus.REVOKED
                    revocation_time = cert.expires_at
                    revocation_reason = x509.ReasonFlags.unspecified
                    logger.info(f"인증서 만료됨: {cert.domain}")
                else:
                    cert_status = OCSPCertStatus.GOOD
                    revocation_time = None
                    revocation_reason = None
                    logger.info(f"인증서 정상: {cert.domain}")
                    
            except SslCertificate.DoesNotExist:
                cert_status = OCSPCertStatus.UNKNOWN
                revocation_time = None
                revocation_reason = None
                logger.warning(f"알 수 없는 인증서: 시리얼 번호 {serial_number}")
            
            # 3. CA 인증서/개인키 로드
            ca = CertificateAuthority.objects.filter(is_active=True).first()
            if not ca:
                logger.error("활성 CA를 찾을 수 없습니다")
                return Response({'error': 'CA not found'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            ca_cert = x509.load_pem_x509_certificate(ca.certificate.encode('utf-8'))
            ca_key = serialization.load_pem_private_key(
                ca.private_key.encode('utf-8'),
                password=None
            )
            
            # 4. OCSP 응답 생성
            builder = OCSPResponseBuilder()
            builder = builder.add_response(
                cert=ca_cert,
                issuer=ca_cert,
                algorithm=hashes.SHA1(),
                cert_status=cert_status,
                this_update=timezone.now(),
                next_update=timezone.now() + timezone.timedelta(days=1),
                revocation_time=revocation_time,
                revocation_reason=revocation_reason,
            )
            
            ocsp_response = builder.sign(private_key=ca_key, algorithm=hashes.SHA256())
            
            # 5. 바이너리 응답 반환
            response = HttpResponse(
                ocsp_response.public_bytes(serialization.Encoding.DER),
                content_type='application/ocsp-response'
            )
            
            # OCSP 응답 헤더 설정
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
            logger.info(f"OCSP 응답 전송: 상태 {cert_status}")
            return response
            
        except Exception as e:
            logger.error(f"OCSP 요청 처리 실패: {e}")
            return Response({'error': 'OCSP request failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """OCSP 상태 확인 (헬스체크용)"""
        return Response({
            'status': 'OCSP server is running',
            'ca_count': CertificateAuthority.objects.filter(is_active=True).count(),
            'cert_count': SslCertificate.objects.count()
        })
