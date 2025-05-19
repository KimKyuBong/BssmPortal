from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from django.http import HttpResponse
import csv
import xlwt
import pandas as pd
from io import BytesIO
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model, login
from rest_framework.permissions import AllowAny
import logging

from .models import Equipment, Rental, RentalRequest, EquipmentMacAddress
from .serializers import EquipmentSerializer, RentalSerializer, RentalRequestSerializer, EquipmentMacAddressSerializer, EquipmentLiteSerializer
from django.contrib.auth import get_user_model
from devices.models import Device

User = get_user_model()

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    관리자는 모든 권한, 일반 사용자는 읽기만 가능
    """
    def has_permission(self, request, view):
        # register, by_mac 액션은 인증 없이 허용
        if getattr(view, 'action', None) in ['register', 'by_mac']:
            return True
            
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_staff


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    본인의 자원이거나 관리자인 경우 접근 가능
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
            
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class EquipmentViewSet(viewsets.ModelViewSet):
    """
    장비 관리 API
    """
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'serial_number', 'description']
    ordering_fields = ['name', 'equipment_type', 'status', 'acquisition_date']
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        return Equipment.objects.prefetch_related('rentals').all()
    
    def get_permissions(self):
        """
        액션별로 권한 설정:
        - register, by_mac: 누구나 접근 가능
        - list, retrieve: 인증된 사용자만 접근 가능
        - 기타 액션: 관리자만 접근 가능
        """
        if self.action in ['register', 'by_mac']:
            return [AllowAny()]
        return [IsAdminOrReadOnly()]
    
    @action(detail=False, methods=['get'])
    def available(self, request):
        """대여 가능한 장비 목록 조회"""
        available_equipment = Equipment.objects.filter(status='AVAILABLE')
        serializer = self.get_serializer(available_equipment, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """장비 목록 엑셀 출력"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        equipment_list = Equipment.objects.all()
        
        wb = xlwt.Workbook(encoding='utf-8')
        ws = wb.add_sheet('장비 목록')
        
        row_num = 0
        font_style = xlwt.XFStyle()
        font_style.font.bold = True
        
        columns = ['ID', '장비명', '종류', '일련번호', '상태', '취득일']
        
        for col_num, column_title in enumerate(columns):
            ws.write(row_num, col_num, column_title, font_style)
            
        font_style = xlwt.XFStyle()
        
        for equipment in equipment_list:
            row_num += 1
            ws.write(row_num, 0, equipment.id, font_style)
            ws.write(row_num, 1, equipment.name, font_style)
            ws.write(row_num, 2, equipment.get_equipment_type_display(), font_style)
            ws.write(row_num, 3, equipment.serial_number, font_style)
            ws.write(row_num, 4, equipment.get_status_display(), font_style)
            ws.write(row_num, 5, str(equipment.acquisition_date), font_style)
        
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.ms-excel'
        )
        response['Content-Disposition'] = 'attachment; filename="equipment_list.xls"'
        
        return response

    @action(detail=False, methods=['post'], url_path='import')
    def import_excel(self, request):
        """엑셀 파일로부터 장비를 일괄 추가하는 API"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        if 'file' not in request.FILES:
            return Response({'error': '파일이 제공되지 않았습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        
        excel_file = request.FILES['file']
        
        try:
            # 엑셀 파일 읽기
            df = pd.read_excel(excel_file)
            
            # 필수 열 확인
            required_columns = ['장비명', '장비 유형', '시리얼 번호', '취득일']
            for col in required_columns:
                if col not in df.columns:
                    return Response({'error': f'필수 열 "{col}"이 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 장비 생성
            created_equipment = []
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # 취득일 처리
                    acquisition_date = row.get('취득일')
                    if pd.isnull(acquisition_date):
                        acquisition_date = timezone.now().date()
                    elif isinstance(acquisition_date, str):
                        try:
                            acquisition_date = pd.to_datetime(acquisition_date).date()
                        except:
                            acquisition_date = timezone.now().date()
                    
                    equipment_data = {
                        'name': row['장비명'],
                        'equipment_type': row['장비 유형'],
                        'serial_number': row['시리얼 번호'],
                        'description': row.get('설명', ''),
                        'status': row.get('장비 상태', 'AVAILABLE'),
                        'acquisition_date': acquisition_date
                    }
                    
                    # 중복 확인
                    if Equipment.objects.filter(serial_number=equipment_data['serial_number']).exists():
                        errors.append({
                            'row': index + 2,  # 엑셀 행 번호 (헤더 + 1)
                            'name': equipment_data['name'],
                            'errors': '이미 존재하는 시리얼 번호입니다.'
                        })
                        continue
                    
                    # 장비 생성
                    serializer = EquipmentSerializer(data=equipment_data)
                    if serializer.is_valid():
                        serializer.save()
                        created_equipment.append(equipment_data['name'])
                    else:
                        errors.append({
                            'row': index + 2,
                            'name': equipment_data['name'],
                            'errors': serializer.errors
                        })
                except Exception as e:
                    errors.append({
                        'row': index + 2,
                        'name': row.get('장비명', '알 수 없음'),
                        'errors': str(e)
                    })
            
            return Response({
                'success': True,
                'created_equipment': created_equipment,
                'errors': errors,
                'total_created': len(created_equipment),
                'total_errors': len(errors)
            })
            
        except Exception as e:
            return Response({'error': f'파일 처리 중 오류가 발생했습니다: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], parser_classes=[JSONParser, MultiPartParser, FormParser])
    def register(self, request):
        """MAC 주소로 장비를 등록하고 대여 정보도 생성"""
        # 시리얼 번호 체크
        serial_number = request.data.get('serial_number')
        if serial_number:
            try:
                existing_equipment = Equipment.objects.get(serial_number=serial_number)
                current_rental = existing_equipment.rentals.filter(status='RENTED').first()
                rental_info = None
                if current_rental and current_rental.user:
                    rental_info = {
                        'user': {
                            'username': current_rental.user.username,
                            'name': current_rental.user.get_full_name() or current_rental.user.username
                        }
                    }
                
                return Response({
                    'error': '이미 등록된 시리얼 번호입니다.',
                    'existing_equipment': {
                        'id': existing_equipment.id,
                        'name': existing_equipment.name,
                        'equipment_type': existing_equipment.get_equipment_type_display(),
                        'status': existing_equipment.get_status_display(),
                        'rental': rental_info
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            except Equipment.DoesNotExist:
                pass

        # MAC 주소 목록이 전달되었는지 확인
        mac_addresses = request.data.get('mac_addresses', [])
        if not mac_addresses:
            return Response(
                {'error': 'mac_addresses 배열이 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # MAC 주소로 사용자 찾기
        user = None
        for mac_item in mac_addresses:
            mac_address = mac_item.get('mac_address') if isinstance(mac_item, dict) else mac_item
            if not mac_address:
                continue
                
            try:
                # Device 모델에서 MAC 주소로 사용자 찾기
                device = Device.objects.get(mac_address=mac_address)
                if device.user:
                    user = device.user
                    break
            except Device.DoesNotExist:
                continue
        
        if not user:
            return Response(
                {'error': '등록된 MAC 주소를 가진 사용자를 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 장비 정보 준비
        equipment_data = request.data.copy()
        
        # 장비 등록
        serializer = self.get_serializer(data=equipment_data)
        if serializer.is_valid():
            equipment = serializer.save()
            
            # 대여 정보 생성
            rental_info = None
            try:
                # 장비 상태를 '대여 중'으로 변경
                equipment.status = 'RENTED'
                equipment.save()
                
                # 대여 정보 생성
                rental = Rental.objects.create(
                    user=user,
                    equipment=equipment,
                    rental_date=timezone.now(),
                    due_date=timezone.now() + timezone.timedelta(days=30),  # 30일 후 반납 예정
                    status='RENTED',
                    notes=f'장비 등록 시 자동 생성된 대여 정보',
                    approved_by=user  # 사용자가 자신의 장비를 등록하므로 자동 승인
                )
                
                # 결과에 포함할 대여 정보
                rental_info = RentalSerializer(rental).data
                print(f"대여 정보 생성 성공: {rental.id}")
            except Exception as e:
                print(f"대여 정보 생성 중 오류 발생: {str(e)}")
            
            # 결과 반환
            result = serializer.data
            if rental_info:
                result['rental_info'] = rental_info
            
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get', 'post'], permission_classes=[AllowAny])
    def by_mac(self, request):
        """MAC 주소로 장비를 조회하는 API"""
        # GET 요청 처리 (쿼리 파라미터에서 MAC 주소 추출)
        if request.method == 'GET':
            mac_address = request.query_params.get('mac_address')
            if not mac_address:
                return Response(
                    {'error': 'mac_address 파라미터가 필요합니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            mac_addresses = [mac_address]
        
        # POST 요청 처리 (요청 본문에서 MAC 주소 목록 추출)
        else:
            mac_address = request.data.get('mac_address')
            mac_addresses = request.data.get('mac_addresses', [])
            
            if not mac_address and not mac_addresses:
                return Response(
                    {'error': 'mac_address 또는 mac_addresses 배열이 필요합니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # 단일 MAC 주소가 있으면 목록에 추가
            if mac_address:
                mac_addresses = [mac_address]
            elif isinstance(mac_addresses, list) and all(isinstance(item, dict) for item in mac_addresses):
                # mac_addresses가 객체 배열인 경우 MAC 주소만 추출
                mac_addresses = [item.get('mac_address') for item in mac_addresses if item.get('mac_address')]
        
        # MAC 주소 목록 순회하며 장비 찾기
        found_equipment = []
        for current_mac in mac_addresses:
            try:
                mac_obj = EquipmentMacAddress.objects.get(mac_address=current_mac)
                equipment = mac_obj.equipment
                if equipment not in found_equipment:  # 중복 제거
                    found_equipment.append(equipment)
            except EquipmentMacAddress.DoesNotExist:
                continue
        
        if not found_equipment:
            return Response(
                {'error': '입력한 MAC 주소를 가진 장비를 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 결과 반환
        serializer = self.get_serializer(found_equipment, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='update-by-model')
    def update_by_model(self, request):
        """모델명 기준으로 생산년도와 구매일시 일괄 업데이트"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        model_name = request.data.get('model_name')
        manufacture_year = request.data.get('manufacture_year')
        purchase_date = request.data.get('purchase_date')
        
        if not model_name:
            return Response({"detail": "모델명이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not manufacture_year and not purchase_date:
            return Response({"detail": "업데이트할 데이터가 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 모델명이 정확히 일치하는 경우
        equipments = Equipment.objects.filter(model_name=model_name)
        
        if not equipments.exists():
            # 모델명이 포함된 장비 검색 (부분 일치)
            equipments = Equipment.objects.filter(model_name__icontains=model_name)
            
        if not equipments.exists():
            return Response({
                "detail": f"모델명 '{model_name}'에 해당하는 장비가 없습니다."
            }, status=status.HTTP_404_NOT_FOUND)
        
        update_data = {}
        
        if manufacture_year is not None:
            try:
                manufacture_year = int(manufacture_year)
                update_data['manufacture_year'] = manufacture_year
            except (ValueError, TypeError):
                return Response({
                    "detail": "생산년도는 유효한 연도(숫자)여야 합니다."
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if purchase_date is not None:
            try:
                # purchase_date가 문자열로 왔다면 datetime으로 변환 시도
                if isinstance(purchase_date, str):
                    from django.utils.dateparse import parse_datetime
                    parsed_date = parse_datetime(purchase_date)
                    if not parsed_date:
                        return Response({
                            "detail": "구매일시 형식이 올바르지 않습니다. (YYYY-MM-DD HH:MM:SS 형식 사용)"
                        }, status=status.HTTP_400_BAD_REQUEST)
                    purchase_date = parsed_date
                update_data['purchase_date'] = purchase_date
            except Exception as e:
                return Response({
                    "detail": f"구매일시 처리 중 오류가 발생했습니다: {str(e)}"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 일괄 업데이트 수행
        count = equipments.count()
        equipments.update(**update_data)
        
        # 업데이트된 장비 목록 반환
        serializer = self.get_serializer(equipments, many=True)
        
        return Response({
            "success": True,
            "message": f"{count}개의 장비가 업데이트되었습니다.",
            "updated_count": count,
            "updated_equipments": serializer.data
        })


class RentalViewSet(viewsets.ModelViewSet):
    """
    대여 정보 관리 API
    """
    queryset = Rental.objects.all()
    serializer_class = RentalSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['equipment__name', 'equipment__serial_number', 'user__username']
    ordering_fields = ['rental_date', 'due_date', 'return_date', 'status']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return Rental.objects.all()
        return Rental.objects.filter(user=user)
    
    def perform_create(self, serializer):
        """대여 정보 생성 시 현재 사용자 및 승인자 정보 추가"""
        equipment = serializer.validated_data.get('equipment')
        
        # 장비 상태 체크
        if equipment.status != 'AVAILABLE':
            return Response(
                {"detail": f"대여할 수 없는 장비입니다. 현재 상태: {equipment.get_status_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 장비 상태 업데이트
        equipment.status = 'RENTED'
        equipment.save()
        
        serializer.save(
            user=self.request.user,
            approved_by=self.request.user if self.request.user.is_staff else None
        )
    
    @action(detail=False, methods=['get'], url_path='active')
    def my_rentals(self, request):
        """내 대여 목록 조회 (현재 대여 중인 것만)"""
        my_rentals = Rental.objects.filter(user=request.user, status='RENTED').select_related('equipment', 'user').order_by('-rental_date')
        page = self.paginate_queryset(my_rentals)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(my_rentals, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='history')
    def my_history(self, request):
        """내 대여 이력 전체 조회 (과거 대여 포함)"""
        my_history = Rental.objects.filter(user=request.user).select_related('equipment', 'user').order_by('-rental_date')
        page = self.paginate_queryset(my_history)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(my_history, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def return_equipment(self, request, pk=None):
        """장비 반납 처리"""
        rental = self.get_object()
        
        if rental.status not in ['RENTED', 'OVERDUE']:
            return Response(
                {"detail": "이미 반납된 장비입니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        rental.status = 'RETURNED'
        rental.return_date = timezone.now()
        rental.returned_to = request.user if request.user.is_staff else None
        rental.save()
        
        # 장비 상태 업데이트
        equipment = rental.equipment
        equipment.status = 'AVAILABLE'
        equipment.save()
        
        serializer = self.get_serializer(rental)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """대여 목록 엑셀 출력"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        rental_list = Rental.objects.all()
        
        wb = xlwt.Workbook(encoding='utf-8')
        ws = wb.add_sheet('대여 내역')
        
        row_num = 0
        font_style = xlwt.XFStyle()
        font_style.font.bold = True
        
        columns = ['ID', '사용자', '장비명', '대여일', '반납예정일', '반납일', '상태']
        
        for col_num, column_title in enumerate(columns):
            ws.write(row_num, col_num, column_title, font_style)
            
        font_style = xlwt.XFStyle()
        
        for rental in rental_list:
            row_num += 1
            ws.write(row_num, 0, rental.id, font_style)
            ws.write(row_num, 1, rental.user.username, font_style)
            ws.write(row_num, 2, rental.equipment.name, font_style)
            ws.write(row_num, 3, str(rental.rental_date), font_style)
            ws.write(row_num, 4, str(rental.due_date), font_style)
            ws.write(row_num, 5, str(rental.return_date) if rental.return_date else "미반납", font_style)
            ws.write(row_num, 6, rental.get_status_display(), font_style)
        
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.ms-excel'
        )
        response['Content-Disposition'] = 'attachment; filename="rental_list.xls"'
        
        return response


class RentalRequestViewSet(viewsets.ModelViewSet):
    """
    대여/반납 요청 관리 API
    """
    queryset = RentalRequest.objects.all()
    serializer_class = RentalRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['equipment__name', 'user__username', 'reason']
    ordering_fields = ['requested_date', 'status', 'request_type']
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return RentalRequest.objects.all()
        return RentalRequest.objects.filter(user=user)
    
    def create(self, request, *args, **kwargs):
        """대여/반납 요청 생성 - equipment 필드 처리"""
        logger = logging.getLogger('rentals')
        
        logger.debug(f"대여/반납 요청 API 호출됨: {request.data}")
        data = request.data.copy()
        
        # 요청 데이터 로깅
        logger.debug(f"원본 요청 데이터: {request.data}")
        
        # 중복 요청 체크
        equipment_id = data.get('equipment')
        request_type = data.get('request_type')
        
        if equipment_id and request_type:
            existing_request = RentalRequest.objects.filter(
                equipment_id=equipment_id,
                request_type=request_type,
                status='PENDING'
            ).first()
            
            if existing_request:
                return Response({
                    "detail": "이미 진행 중인 요청이 있습니다.",
                    "existing_request": {
                        "id": existing_request.id,
                        "request_type": existing_request.get_request_type_display(),
                        "status": existing_request.get_status_display(),
                        "requested_date": existing_request.requested_date
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 이 부분을 수정하지 않음 - equipment 필드를 그대로 유지
        # 시리얼라이저는 equipment 필드를 사용하므로 변환하지 않음
        
        logger.debug(f"처리할 데이터: {data}")
        
        serializer = self.get_serializer(data=data)
        
        # 유효성 검사 수행
        if not serializer.is_valid():
            logger.error(f"유효성 검사 오류: {serializer.errors}")
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response({"success": True, "data": serializer.data}, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.exception(f"대여/반납 요청 생성 중 오류 발생: {str(e)}")
            return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def perform_create(self, serializer):
        """요청 생성 시 현재 사용자 정보 추가"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """승인 대기 중인 요청 목록 조회 (관리자용)"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        pending_requests = RentalRequest.objects.filter(status='PENDING')
        serializer = self.get_serializer(pending_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """요청 승인 처리"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        rental_request = self.get_object()
        
        if rental_request.status != 'PENDING':
            return Response(
                {"detail": "이미 처리된 요청입니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 요청 정보 업데이트
        rental_request.status = 'APPROVED'
        rental_request.processed_by = request.user
        rental_request.processed_at = timezone.now()
        
        if rental_request.request_type == 'RENT':
            # 장비 상태 체크
            equipment = rental_request.equipment
            if equipment.status != 'AVAILABLE':
                return Response(
                    {"detail": f"대여할 수 없는 장비입니다. 현재 상태: {equipment.get_status_display()}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # 새 대여 정보 생성
            rental = Rental.objects.create(
                user=rental_request.user,
                equipment=equipment,
                rental_date=timezone.now(),
                due_date=rental_request.expected_return_date or (timezone.now() + timezone.timedelta(days=30)),
                status='RENTED',
                notes=f"대여 요청 #{rental_request.id}에 의해 생성됨",
                approved_by=request.user
            )
            
            # 요청과 대여 정보 연결
            rental_request.rental = rental
            
            # 장비 상태 업데이트
            equipment.status = 'RENTED'
            equipment.save()
            
        elif rental_request.request_type == 'RETURN':
            # 현재 사용자의 해당 장비 대여 정보 검색
            try:
                rental = Rental.objects.get(
                    user=rental_request.user,
                    equipment=rental_request.equipment,
                    status__in=['RENTED', 'OVERDUE']
                )
            except Rental.DoesNotExist:
                return Response(
                    {"detail": "대여 중인 장비를 찾을 수 없습니다."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # 대여 정보 업데이트
            rental.status = 'RETURNED'
            rental.return_date = timezone.now()
            rental.returned_to = request.user
            rental.save()
            
            # 요청과 대여 정보 연결
            rental_request.rental = rental
            
            # 장비 상태 업데이트
            equipment = rental_request.equipment
            equipment.status = 'AVAILABLE'
            equipment.save()
        
        rental_request.save()
        serializer = self.get_serializer(rental_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """요청 거부 처리"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        rental_request = self.get_object()
        
        if rental_request.status != 'PENDING':
            return Response(
                {"detail": "이미 처리된 요청입니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        rental_request.status = 'REJECTED'
        rental_request.processed_by = request.user
        rental_request.processed_at = timezone.now()
        
        # 거부 사유가 있으면 저장
        reason = request.data.get('reason')
        if reason:
            rental_request.reject_reason = reason
        
        rental_request.save()
        
        serializer = self.get_serializer(rental_request)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": f"요청이 성공적으로 {request.data.get('action')}되었습니다."
        })
        
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """요청 처리 (승인 또는 거부)"""
        logger = logging.getLogger('rentals')
        logger.debug(f"process 액션 호출됨: {request.data}")
        
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        rental_request = self.get_object()
        
        if rental_request.status != 'PENDING':
            return Response(
                {"detail": "이미 처리된 요청입니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 액션 타입 확인 (approve 또는 reject)
        action = request.data.get('action')
        reason = request.data.get('reason')
        
        logger.debug(f"처리 유형: {action}, 사유: {reason}")
        
        if action not in ['approve', 'reject']:
            return Response(
                {"detail": "유효하지 않은 액션입니다. 'approve' 또는 'reject'만 허용됩니다."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 승인 처리
        if action == 'approve':
            rental_request.status = 'APPROVED'
            rental_request.processed_by = request.user
            rental_request.processed_at = timezone.now()
            
            if rental_request.request_type == 'RENT':
                # 장비 상태 체크
                equipment = rental_request.equipment
                if equipment.status != 'AVAILABLE':
                    return Response(
                        {"detail": f"대여할 수 없는 장비입니다. 현재 상태: {equipment.get_status_display()}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                # 새 대여 정보 생성
                rental = Rental.objects.create(
                    user=rental_request.user,
                    equipment=equipment,
                    rental_date=timezone.now(),
                    due_date=rental_request.expected_return_date or (timezone.now() + timezone.timedelta(days=30)),
                    status='RENTED',
                    notes=f"대여 요청 #{rental_request.id}에 의해 생성됨",
                    approved_by=request.user
                )
                
                # 요청과 대여 정보 연결
                rental_request.rental = rental
                
                # 장비 상태 업데이트
                equipment.status = 'RENTED'
                equipment.save()
                
            elif rental_request.request_type == 'RETURN':
                # 현재 사용자의 해당 장비 대여 정보 검색
                try:
                    rental = Rental.objects.get(
                        user=rental_request.user,
                        equipment=rental_request.equipment,
                        status__in=['RENTED', 'OVERDUE']
                    )
                except Rental.DoesNotExist:
                    return Response(
                        {"detail": "대여 중인 장비를 찾을 수 없습니다."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                # 대여 정보 업데이트
                rental.status = 'RETURNED'
                rental.return_date = timezone.now()
                rental.returned_to = request.user
                rental.save()
                
                # 요청과 대여 정보 연결
                rental_request.rental = rental
                
                # 장비 상태 업데이트
                equipment = rental_request.equipment
                equipment.status = 'AVAILABLE'
                equipment.save()
        
        # 거부 처리
        elif action == 'reject':
            rental_request.status = 'REJECTED'
            rental_request.processed_by = request.user
            rental_request.processed_at = timezone.now()
            
            # 거부 사유가 있으면 저장
            if reason:
                rental_request.reject_reason = reason
        
        # 요청 정보 저장
        rental_request.save()
        
        serializer = self.get_serializer(rental_request)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": f"요청이 성공적으로 {action}되었습니다."
        })
    
    @action(detail=False, methods=['get'], url_path='my')
    def my_requests(self, request):
        """내 대여/반납 요청 목록 조회"""
        my_requests = RentalRequest.objects.filter(user=request.user).order_by('-requested_date')
        serializer = self.get_serializer(my_requests, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_reason(self, request, pk=None):
        """요청 사유 수정 (PENDING 상태인 경우만 가능)"""
        logger = logging.getLogger('rentals')
        logger.debug(f"update_reason 호출됨: {request.data}")
        
        rental_request = self.get_object()
        
        # 요청자 본인 또는 관리자만 수정 가능
        if rental_request.user != request.user and not request.user.is_staff:
            return Response({"detail": "이 요청을 수정할 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # 대기 상태일 때만 수정 가능
        if rental_request.status != 'PENDING':
            return Response({"detail": "이미 처리된 요청은 수정할 수 없습니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 사유 업데이트
        reason = request.data.get('reason')
        if reason is not None:
            rental_request.reason = reason
            rental_request.save(update_fields=['reason'])
            
            logger.debug(f"사유 업데이트 성공: {reason}")
            
            serializer = self.get_serializer(rental_request)
            return Response({
                "success": True,
                "data": serializer.data,
                "message": "요청 사유가 성공적으로 업데이트되었습니다."
            })
        else:
            return Response({"detail": "사유가 제공되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        """거부된 요청 재신청 (REJECTED 상태인 경우만 가능)"""
        logger = logging.getLogger('rentals')
        logger.debug(f"resubmit 호출됨: {request.data}")
        
        rental_request = self.get_object()
        
        # 요청자 본인만 재신청 가능
        if rental_request.user != request.user:
            return Response({"detail": "이 요청을 재신청할 권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        
        # 거부된 상태일 때만 재신청 가능
        if rental_request.status != 'REJECTED':
            return Response({"detail": "거부된 요청만 재신청할 수 있습니다."}, status=status.HTTP_400_BAD_REQUEST)
        
        # 새 사유 업데이트 (제공된 경우)
        reason = request.data.get('reason')
        if reason:
            rental_request.reason = reason
        
        # 상태 업데이트 및 처리 정보 초기화
        rental_request.status = 'PENDING'
        rental_request.processed_by = None
        rental_request.processed_at = None
        rental_request.requested_date = timezone.now()  # 요청일을 현재 시간으로 업데이트
        
        # 반납 예정일 업데이트 (제공된 경우)
        expected_return_date = request.data.get('expected_return_date')
        if expected_return_date and rental_request.request_type == 'RENT':
            try:
                rental_request.expected_return_date = expected_return_date
            except:
                pass
        
        rental_request.save()
        
        logger.debug(f"재신청 성공: {rental_request.id}")
        
        serializer = self.get_serializer(rental_request)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "요청이 성공적으로 재신청되었습니다."
        })
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """요청 목록 엑셀 출력"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        request_list = RentalRequest.objects.all()
        
        wb = xlwt.Workbook(encoding='utf-8')
        ws = wb.add_sheet('대여/반납 요청 내역')
        
        row_num = 0
        font_style = xlwt.XFStyle()
        font_style.font.bold = True
        
        columns = ['ID', '사용자', '요청 유형', '장비명', '요청일', '상태', '처리자', '처리일']
        
        for col_num, column_title in enumerate(columns):
            ws.write(row_num, col_num, column_title, font_style)
            
        font_style = xlwt.XFStyle()
        
        for req in request_list:
            row_num += 1
            ws.write(row_num, 0, req.id, font_style)
            ws.write(row_num, 1, req.user.username, font_style)
            ws.write(row_num, 2, req.get_request_type_display(), font_style)
            ws.write(row_num, 3, req.equipment.name, font_style)
            ws.write(row_num, 4, str(req.requested_date), font_style)
            ws.write(row_num, 5, req.get_status_display(), font_style)
            ws.write(row_num, 6, req.processed_by.username if req.processed_by else "미처리", font_style)
            ws.write(row_num, 7, str(req.processed_at) if req.processed_at else "미처리", font_style)
        
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.ms-excel'
        )
        response['Content-Disposition'] = 'attachment; filename="rental_requests.xls"'
        
        return response


class EquipmentMacAddressViewSet(viewsets.ModelViewSet):
    queryset = EquipmentMacAddress.objects.all()
    serializer_class = EquipmentMacAddressSerializer
    permission_classes = [AllowAny]  # 기본 권한을 AllowAny로 설정
    parser_classes = [JSONParser, FormParser, MultiPartParser]  # 파서 클래스 추가
    
    @action(detail=False, methods=['post'])
    def login_and_rent(self, request):
        """MAC 주소로 로그인하고 장비를 대여하는 API"""
        # 단일 MAC 주소 또는 MAC 주소 목록 받기
        mac_address = request.data.get('mac_address')
        mac_addresses = request.data.get('mac_addresses', [])
        
        # 둘 다 없는 경우
        if not mac_address and not mac_addresses:
            return Response(
                {'error': 'mac_address 또는 mac_addresses 배열이 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 단일 MAC 주소가 있으면 목록에 추가
        if mac_address:
            mac_addresses.append({'mac_address': mac_address})
        
        # MAC 주소 목록 순회하며 사용자 찾기
        for mac_item in mac_addresses:
            current_mac = mac_item.get('mac_address') if isinstance(mac_item, dict) else mac_item
            if not current_mac:
                continue
                
            try:
                # MAC 주소로 장비 찾기
                mac_obj = EquipmentMacAddress.objects.get(mac_address=current_mac)
                equipment = mac_obj.equipment
                
                # 현재 대여 중인 사용자 찾기
                current_rental = equipment.rentals.filter(status='RENTED').first()
                if current_rental:
                    return Response({
                        'message': '이미 등록된 장비입니다.',
                        'equipment': EquipmentSerializer(equipment).data,
                        'current_user': {
                            'username': current_rental.user.username,
                            'full_name': current_rental.user.get_full_name()
                        }
                    }, status=status.HTTP_200_OK)
                
                # 사용자 정보 확인
                if hasattr(equipment, 'user') and equipment.user:
                    user = equipment.user
                    login(request, user)
                    
                    # 대여 정보 생성
                    rental = Rental.objects.create(
                        user=user,
                        equipment=equipment,
                        status='RENTED',
                        notes=f'MAC 주소({current_mac})를 통한 자동 대여'
                    )
                    
                    # 장비 상태 업데이트
                    equipment.status = 'RENTED'
                    equipment.save()
                    
                    return Response({
                        'message': '로그인 및 장비 대여가 완료되었습니다.',
                        'user': {
                            'id': user.id,
                            'username': user.username,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'email': user.email
                        },
                        'rental': RentalSerializer(rental).data,
                        'equipment': EquipmentSerializer(equipment).data
                    })
            except EquipmentMacAddress.DoesNotExist:
                # 이 MAC 주소로 장비를 찾지 못했으므로 다음 MAC 주소 시도
                continue
        
        # 모든 MAC 주소를 시도해도 장비를 찾지 못한 경우
        return Response(
            {'error': '등록된 MAC 주소를 가진 장비가 없습니다.'},
            status=status.HTTP_404_NOT_FOUND
        )
