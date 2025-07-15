from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q, Count, Sum
from django.core.cache import cache
from django.http import JsonResponse
import time
import secrets

from .models import TOTPAPIKey, APIKeyUsageLog, SecurityPolicy
from .serializers import (
    TOTPAPIKeyCreateSerializer, TOTPAPIKeyDetailSerializer, TOTPAPIKeyListSerializer,
    TOTPVerificationSerializer, APIKeyUsageLogSerializer, SecurityPolicySerializer,
    APIKeyRegenerateSerializer, APIKeyStatsSerializer
)
from core.permissions import IsAdminUser, IsAuthenticatedUser, IsOwnerOrAdmin


# IsOwnerOrAdmin 클래스 제거 - core.permissions에서 import


class TOTPAPIKeyViewSet(viewsets.ModelViewSet):
    """TOTP API 키 관리 뷰셋"""
    
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return TOTPAPIKey.objects.all()
        return TOTPAPIKey.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TOTPAPIKeyCreateSerializer
        elif self.action in ['retrieve', 'update', 'partial_update']:
            return TOTPAPIKeyDetailSerializer
        return TOTPAPIKeyListSerializer
    
    def create(self, request, *args, **kwargs):
        """API 키 생성"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 사용자당 최대 키 수 확인
        policy = SecurityPolicy.get_default_policy()
        user_key_count = TOTPAPIKey.objects.filter(user=request.user).count()
        
        if user_key_count >= policy.max_keys_per_user:
            return Response(
                {"error": f"사용자당 최대 {policy.max_keys_per_user}개의 API 키만 생성할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # API 키 생성
        api_key_obj = serializer.save()
        
        # 생성된 정보 반환
        response_data = {
            'id': api_key_obj.id,
            'name': api_key_obj.name,
            'api_key': serializer.context['generated_api_key'],
            'totp_secret': serializer.context['totp_secret'],
            'qr_code': TOTPAPIKeyDetailSerializer(api_key_obj, context={'request': request}).data['totp_qr_code'],
            'message': 'API 키가 성공적으로 생성되었습니다. TOTP 앱에 QR 코드를 스캔하거나 시크릿 키를 입력하세요.'
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """API 키 재생성"""
        api_key_obj = self.get_object()
        
        serializer = APIKeyRegenerateSerializer(
            data=request.data,
            context={'api_key_obj': api_key_obj}
        )
        serializer.is_valid(raise_exception=True)
        
        # 새로운 API 키 생성
        new_api_key = TOTPAPIKey.generate_api_key()
        new_salt = secrets.token_hex(32)
        new_api_key_hash = TOTPAPIKey.hash_api_key(new_api_key, new_salt)
        
        # 기존 키 비활성화
        api_key_obj.is_active = False
        api_key_obj.save()
        
        # 새 키 생성
        new_totp_api_key = TOTPAPIKey.objects.create(
            user=api_key_obj.user,
            name=f"{api_key_obj.name} (재생성)",
            totp_secret=api_key_obj.totp_secret,  # TOTP 시크릿은 유지
            api_key_hash=new_api_key_hash,
            salt=new_salt,
            permissions=api_key_obj.permissions,
            max_requests_per_minute=api_key_obj.max_requests_per_minute,
            max_requests_per_hour=api_key_obj.max_requests_per_hour,
            expires_at=api_key_obj.expires_at
        )
        
        response_data = {
            'id': new_totp_api_key.id,
            'name': new_totp_api_key.name,
            'api_key': new_api_key,
            'message': 'API 키가 성공적으로 재생성되었습니다.'
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """API 키 활성화/비활성화 토글"""
        api_key_obj = self.get_object()
        api_key_obj.is_active = not api_key_obj.is_active
        api_key_obj.save()
        
        status_text = "활성화" if api_key_obj.is_active else "비활성화"
        
        return Response({
            'message': f'API 키가 {status_text}되었습니다.',
            'is_active': api_key_obj.is_active
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def usage_logs(self, request, pk=None):
        """API 키 사용 로그 조회"""
        api_key_obj = self.get_object()
        logs = APIKeyUsageLog.objects.filter(api_key=api_key_obj).order_by('-timestamp')[:100]
        
        serializer = APIKeyUsageLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """API 키 통계 조회"""
        queryset = self.get_queryset()
        
        total_keys = queryset.count()
        active_keys = queryset.filter(is_active=True).count()
        expired_keys = queryset.filter(expires_at__lt=timezone.now()).count()
        
        total_requests = queryset.aggregate(total=Sum('total_requests'))['total'] or 0
        failed_requests = queryset.aggregate(failed=Sum('failed_attempts'))['failed'] or 0
        success_rate = ((total_requests - failed_requests) / total_requests * 100) if total_requests > 0 else 0
        
        # 최근 활동 (최근 7일)
        recent_logs = APIKeyUsageLog.objects.filter(
            api_key__in=queryset,
            timestamp__gte=timezone.now() - timezone.timedelta(days=7)
        ).order_by('-timestamp')[:10]
        
        recent_activity = []
        for log in recent_logs:
            recent_activity.append({
                'api_key_name': log.api_key.name,
                'endpoint': log.endpoint,
                'method': log.method,
                'status_code': log.status_code,
                'timestamp': log.timestamp,
                'success': log.success
            })
        
        stats_data = {
            'total_keys': total_keys,
            'active_keys': active_keys,
            'expired_keys': expired_keys,
            'total_requests': total_requests,
            'failed_requests': failed_requests,
            'success_rate': round(success_rate, 2),
            'recent_activity': recent_activity
        }
        
        serializer = APIKeyStatsSerializer(stats_data)
        return Response(serializer.data)


class TOTPVerificationView(APIView):
    """TOTP 코드 검증 뷰"""
    
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def post(self, request):
        serializer = TOTPVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        api_key_obj = serializer.validated_data['api_key_obj']
        
        # 사용 통계 업데이트
        api_key_obj.increment_usage(success=True)
        
        # 사용 로그 기록
        APIKeyUsageLog.objects.create(
            api_key=api_key_obj,
            endpoint='/api/security/verify/',
            method='POST',
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            status_code=200,
            response_time=0.0,
            success=True
        )
        
        return Response({
            'message': 'TOTP 코드가 성공적으로 검증되었습니다.',
            'api_key_name': api_key_obj.name,
            'user': api_key_obj.user.username,
            'permissions': api_key_obj.permissions
        }, status=status.HTTP_200_OK)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityPolicyViewSet(viewsets.ModelViewSet):
    """보안 정책 관리 뷰셋"""
    
    queryset = SecurityPolicy.objects.all()
    serializer_class = SecurityPolicySerializer
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """기본 보안 정책 조회"""
        policy = SecurityPolicy.get_default_policy()
        serializer = self.get_serializer(policy)
        return Response(serializer.data)


class APIKeyUsageLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API 키 사용 로그 뷰셋"""
    
    serializer_class = APIKeyUsageLogSerializer
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return APIKeyUsageLog.objects.all()
        
        # 일반 사용자는 자신의 API 키 로그만 조회
        user_api_keys = TOTPAPIKey.objects.filter(user=self.request.user)
        return APIKeyUsageLog.objects.filter(api_key__in=user_api_keys)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """최근 사용 로그 조회"""
        queryset = self.get_queryset().order_by('-timestamp')[:50]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """날짜별 사용 로그 조회"""
        from datetime import datetime
        
        date_str = request.query_params.get('date')
        if not date_str:
            return Response(
                {"error": "date 파라미터가 필요합니다. (YYYY-MM-DD 형식)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용하세요."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(
            timestamp__date=target_date
        ).order_by('-timestamp')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RateLimitMiddleware:
    """API 키 요청 제한 미들웨어"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # API 키 헤더 확인
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return self.get_response(request)
        
        # API 키 검증 및 요청 제한 확인
        if not self.check_rate_limit(request, api_key):
            return JsonResponse({
                'error': '요청 제한을 초과했습니다. 잠시 후 다시 시도하세요.'
            }, status=429)
        
        response = self.get_response(request)
        return response
    
    def check_rate_limit(self, request, api_key):
        """요청 제한 확인"""
        # API 키 해시로 검색
        for totp_api_key in TOTPAPIKey.objects.filter(is_active=True):
            if TOTPAPIKey.hash_api_key(api_key, totp_api_key.salt) == totp_api_key.api_key_hash:
                # 분당 요청 제한 확인
                minute_key = f"rate_limit_minute_{totp_api_key.id}_{int(time.time() // 60)}"
                minute_count = cache.get(minute_key, 0)
                
                if minute_count >= totp_api_key.max_requests_per_minute:
                    return False
                
                # 시간당 요청 제한 확인
                hour_key = f"rate_limit_hour_{totp_api_key.id}_{int(time.time() // 3600)}"
                hour_count = cache.get(hour_key, 0)
                
                if hour_count >= totp_api_key.max_requests_per_hour:
                    return False
                
                # 카운터 증가
                cache.set(minute_key, minute_count + 1, 60)
                cache.set(hour_key, hour_count + 1, 3600)
                
                return True
        
        return False
