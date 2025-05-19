from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import logging
# django_filters 모듈 제거 (설치되지 않음)
# from django_filters.rest_framework import DjangoFilterBackend

from ..models import DeviceHistory
from ..serializers import DeviceHistorySerializer
from ..permissions import IsSuperUser, IsStaffUser

logger = logging.getLogger(__name__)

class DeviceHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """장치 이력 조회 뷰셋 (관리자 전용)"""
    serializer_class = DeviceHistorySerializer
    permission_classes = [IsSuperUser]  # 관리자만 접근 가능하도록 변경
    # DjangoFilterBackend 제거
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    # filterset_fields 제거 (DjangoFilterBackend에 의존)
    # filterset_fields = ['user', 'device_name', 'device_mac', 'action']
    search_fields = ['device_name', 'device_mac', 'details', 'user__username']
    ordering_fields = ['created_at', 'user__username', 'device_name', 'action']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # 관리자만 접근 가능하므로 모든 이력 반환
        return DeviceHistory.objects.all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        """모든 장치 이력 조회 (페이지네이션 및 필터링 지원)"""
        queryset = self.filter_queryset(self.get_queryset())
        
        # 추가 필터링 (날짜 범위 등) - 수동으로 구현
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        username = request.query_params.get('username')
        action_type = request.query_params.get('action_type')
        user = request.query_params.get('user')
        device_name = request.query_params.get('device_name')
        device_mac = request.query_params.get('device_mac')
        action = request.query_params.get('action')
        
        # 필터링 로직 구현 (이전에 DjangoFilterBackend가 자동으로 처리하던 부분)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        if username:
            queryset = queryset.filter(user__username__icontains=username)
        if action_type:
            queryset = queryset.filter(action__iexact=action_type)
        if user:
            queryset = queryset.filter(user_id=user)
        if device_name:
            queryset = queryset.filter(device_name__icontains=device_name)
        if device_mac:
            queryset = queryset.filter(device_mac__icontains=device_mac)
        if action:
            queryset = queryset.filter(action__iexact=action)
            
        # 페이지네이션 처리
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        try:
            page = int(page)
            page_size = int(page_size)
        except ValueError:
            page = 1
            page_size = 20
            
        start = (page - 1) * page_size
        end = start + page_size
        
        # 전체 이력 수
        total_count = queryset.count()
        
        # 페이지네이션 적용
        histories = queryset[start:end]
        
        serializer = self.get_serializer(histories, many=True)
        
        return Response({
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def user(self, request):
        """특정 사용자의 장치 이력 조회"""
        user_id = request.query_params.get('user_id')
        if user_id:
            histories = DeviceHistory.objects.filter(user_id=user_id).order_by('-created_at')
        else:
            # 사용자 ID가 제공되지 않은 경우 모든 이력 반환
            histories = DeviceHistory.objects.all().order_by('-created_at')
        
        serializer = self.get_serializer(histories, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def simple(self, request):
        """간단한 형태의 기기 이력 목록 (관리자 대시보드용)"""
        # 최근 활동 10개만 조회
        histories = DeviceHistory.objects.all().order_by('-created_at')[:10]
        serializer = self.get_serializer(histories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def device_history(self, request):
        """특정 MAC 주소를 가진 장치의 이력 조회"""
        mac_address = request.query_params.get('mac_address')
        if not mac_address:
            return Response({"detail": "MAC 주소를 제공해야 합니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 권한 확인
        if not (request.user.is_superuser or request.user.is_staff):
            # 일반 사용자는 자신의 디바이스 이력만 조회 가능
            histories = DeviceHistory.objects.filter(
                mac_address=mac_address,
                user=request.user
            ).order_by('-created_at')
        else:
            # 관리자 또는 교사는 모든 디바이스 이력 조회 가능
            histories = DeviceHistory.objects.filter(
                mac_address=mac_address
            ).order_by('-created_at')
            
        serializer = self.get_serializer(histories, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_history(self, request):
        """현재 로그인한 사용자의 장치 이력 조회"""
        user = request.user
        histories = DeviceHistory.objects.filter(user=user).order_by('-created_at')
        
        # 페이지네이션 처리
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        try:
            page = int(page)
            page_size = int(page_size)
        except ValueError:
            page = 1
            page_size = 20
            
        start = (page - 1) * page_size
        end = start + page_size
        
        # 전체 이력 수
        total_count = histories.count()
        
        # 페이지네이션 적용
        histories = histories[start:end]
        
        serializer = self.get_serializer(histories, many=True)
        
        return Response({
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'results': serializer.data
        }) 