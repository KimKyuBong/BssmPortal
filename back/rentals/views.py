from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from django.http import HttpResponse
import csv
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
import pandas as pd
from io import BytesIO
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model, login
from rest_framework.permissions import AllowAny
import logging
from rest_framework.pagination import PageNumberPagination
from django.db.models import Prefetch
from django.db import transaction
from datetime import datetime

from .models import Equipment, Rental, RentalRequest, EquipmentMacAddress, EquipmentHistory
from .serializers import EquipmentSerializer, RentalSerializer, RentalRequestSerializer, EquipmentMacAddressSerializer, EquipmentLiteSerializer, EquipmentHistorySerializer
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


class EquipmentPagination(PageNumberPagination):
    page_size = 500
    page_size_query_param = 'page_size'
    max_page_size = 500


class EquipmentViewSet(viewsets.ModelViewSet):
    """
    장비 관리 API
    """
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['asset_number', 'serial_number', 'description']
    ordering_fields = ['asset_number', 'equipment_type', 'status', 'acquisition_date']
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = EquipmentPagination
    
    def get_queryset(self):
        return Equipment.objects.prefetch_related(
            Prefetch(
                'rentals',
                queryset=Rental.objects.filter(status='RENTED').select_related('user').order_by('-rental_date'),
                to_attr='current_rentals'
            )
        ).all()
    
    def get_permissions(self):
        """
        액션별로 권한 설정:
        - register, by_mac: 누구나 접근 가능
        - list, retrieve: 인증된 사용자만 접근 가능
        - 기타 액션: 관리자만 접근 가능
        """
        if self.action in ['register', 'by_mac']:
            return [AllowAny()]
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrReadOnly()]
    
    def update(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            logger.info(f"장비 업데이트 요청 - ID: {kwargs.get('pk')}")
            logger.info(f"요청 데이터: {request.data}")
            
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            
            if not serializer.is_valid():
                logger.error(f"유효성 검사 실패: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            self.perform_update(serializer)
            
            # 장비 상태가 'AVAILABLE'로 변경된 경우, 관련 대여 기록 업데이트
            if serializer.validated_data.get('status') == 'AVAILABLE':
                active_rentals = Rental.objects.filter(
                    equipment=instance,
                    status='RENTED'
                )
                if active_rentals.exists():
                    active_rentals.update(status='RETURNED')
                    logger.info(f"장비 상태 변경으로 인한 대여 기록 업데이트 - 장비 ID: {instance.id}")
            
            logger.info(f"장비 업데이트 성공 - ID: {instance.id}")
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"장비 업데이트 중 예외 발생: {str(e)}")
            return Response(
                {'error': f'장비 업데이트 중 오류가 발생했습니다: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def available(self, request):
        """대여 가능한 장비 목록 조회"""
        # 대여 가능한 장비만 필터링 (상태가 'AVAILABLE'인 장비)
        available_equipment = Equipment.objects.filter(status='AVAILABLE').order_by('management_number')
        
        # 페이지네이션 없이 배열로 반환
        serializer = self.get_serializer(available_equipment, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        logger = logging.getLogger(__name__)
        try:
            logger.info("엑셀 내보내기 시작")
            
            # 모든 장비 정보 조회 (관리번호 오름차순 정렬)
            equipment_list = Equipment.objects.all().prefetch_related('rentals').order_by('management_number')
            logger.info(f"조회된 장비 수: {equipment_list.count()}")
            
            # 데이터 준비
            data = []
            for idx, equipment in enumerate(equipment_list, 1):
                try:
                    # 현재 대여 중인 정보 찾기
                    current_rental = equipment.rentals.filter(status='RENTED').first()
                    logger.debug(f"장비 {equipment.asset_number}의 현재 대여 정보: {current_rental}")
                    
                    # 사용자 이름 생성
                    user_name = ''
                    if current_rental and current_rental.user:
                        first_name = current_rental.user.first_name or ''
                        last_name = current_rental.user.last_name or ''
                        user_name = f"{last_name}{first_name}".strip() or current_rental.user.username
                    
                    equipment_data = {
                        '연번': idx,
                        '종류': equipment.get_equipment_type_display(),
                        '관리번호': equipment.management_number,
                        '제조사': equipment.manufacturer,
                        '모델명': equipment.model_name,
                        '구매일자': equipment.purchase_date.strftime('%Y-%m-%d') if equipment.purchase_date else '',
                        '구매금액': f"₩{int(equipment.purchase_price):,}" if equipment.purchase_price else '',
                        '대여자': user_name,
                        '대여자 아이디': current_rental.user.username if current_rental and current_rental.user else '',
                        '대여일자': current_rental.rental_date.strftime('%Y-%m-%d') if current_rental else '',
                        '관리자 확인': ''
                    }
                    data.append(equipment_data)
                    logger.debug(f"장비 {equipment.asset_number} 데이터 처리 완료")
                except Exception as e:
                    logger.error(f"장비 {equipment.asset_number} 데이터 처리 중 오류: {str(e)}")
                    raise
            
            logger.info("DataFrame 생성 시작")
            # DataFrame 생성
            df = pd.DataFrame(data)
            logger.info(f"DataFrame 생성 완료: {len(df)} 행")
            
            # 엑셀 파일 생성
            response = HttpResponse(content_type='application/vnd.ms-excel')
            response['Content-Disposition'] = f'attachment; filename=equipment_list_{datetime.now().strftime("%Y%m%d")}.xlsx'
            
            logger.info("엑셀 파일 저장 시작")
            # 엑셀 파일로 저장
            df.to_excel(response, index=False, sheet_name='장비목록')
            logger.info("엑셀 파일 저장 완료")
            
            return response
            
        except Exception as e:
            logger.error(f"엑셀 내보내기 중 오류 발생: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
            required_columns = ['물품번호', '장비 유형', '시리얼 번호', '취득일']
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
                        'asset_number': row['물품번호'],
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
                            'asset_number': equipment_data['asset_number'],
                            'errors': '이미 존재하는 시리얼 번호입니다.'
                        })
                        continue
                    
                    # 장비 생성
                    serializer = EquipmentSerializer(data=equipment_data)
                    if serializer.is_valid():
                        serializer.save()
                        created_equipment.append(equipment_data['asset_number'])
                    else:
                        errors.append({
                            'row': index + 2,
                            'asset_number': equipment_data['asset_number'],
                            'errors': serializer.errors
                        })
                except Exception as e:
                    errors.append({
                        'row': index + 2,
                        'asset_number': row.get('물품번호', '알 수 없음'),
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
                        'asset_number': existing_equipment.asset_number,
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
            
            logger.info(f"대여 생성 성공: {rental.id}")
            return Response({
                "success": True,
                "data": result,
                "message": "대여가 성공적으로 생성되었습니다."
            }, status=status.HTTP_201_CREATED)
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
                mac_addresses.append({'mac_address': mac_address})
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
        """모델명 기준으로 생산년도, 구매일시, 구매가격 일괄 업데이트"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        model_name = request.data.get('model_name')
        manufacture_year = request.data.get('manufacture_year')
        purchase_date = request.data.get('purchase_date')
        purchase_price = request.data.get('purchase_price')
        
        if not model_name:
            return Response({"detail": "모델명이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not manufacture_year and not purchase_date and purchase_price is None:
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
        
        if purchase_price is not None:
            try:
                # 빈 문자열이나 None이 아닌 경우에만 처리
                if purchase_price != '' and purchase_price is not None:
                    purchase_price = float(purchase_price)
                    if purchase_price < 0:
                        return Response({
                            "detail": "구매가격은 0 이상이어야 합니다."
                        }, status=status.HTTP_400_BAD_REQUEST)
                    update_data['purchase_price'] = purchase_price
                elif purchase_price == '':
                    # 빈 문자열인 경우 None으로 설정 (필드 초기화)
                    update_data['purchase_price'] = None
            except (ValueError, TypeError):
                return Response({
                    "detail": "구매가격은 유효한 숫자여야 합니다."
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 일괄 업데이트 수행
        count = equipments.count()
        
        # 각 장비를 개별적으로 저장하여 관리번호 업데이트 로직이 작동하도록 함
        updated_equipments = []
        for equipment in equipments:
            # 업데이트할 필드들을 설정
            if 'manufacture_year' in update_data:
                equipment.manufacture_year = update_data['manufacture_year']
            if 'purchase_date' in update_data:
                equipment.purchase_date = update_data['purchase_date']
            if 'purchase_price' in update_data:
                equipment.purchase_price = update_data['purchase_price']
            
            # save() 메서드를 호출하여 관리번호 업데이트 로직이 작동하도록 함
            equipment.save()
            updated_equipments.append(equipment)
        
        # 업데이트된 장비 목록 반환
        serializer = self.get_serializer(updated_equipments, many=True)
        
        return Response({
            "success": True,
            "message": f"{count}개의 장비가 업데이트되었습니다.",
            "updated_count": count,
            "updated_equipments": serializer.data
        })

    @action(detail=False, methods=['get'], url_path='get-model-info')
    def get_model_info(self, request):
        """모델명에 해당하는 장비의 정보를 가져옴"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        model_name = request.query_params.get('model_name')
        if not model_name:
            return Response({"detail": "모델명이 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 모델명이 정확히 일치하는 장비 중 가장 먼저 등록된 장비의 정보를 가져옴
        equipment = Equipment.objects.filter(model_name=model_name).order_by('created_at').first()
        
        if not equipment:
            # 모델명이 포함된 장비 검색 (부분 일치)
            equipment = Equipment.objects.filter(model_name__icontains=model_name).order_by('created_at').first()
            
        if not equipment:
            return Response({
                "detail": f"모델명 '{model_name}'에 해당하는 장비가 없습니다."
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            "success": True,
            "data": {
                "model_name": equipment.model_name,
                "manufacture_year": equipment.manufacture_year,
                "purchase_date": equipment.purchase_date,
                "purchase_price": equipment.purchase_price
            }
        })

    @action(detail=True, methods=['get'], url_path='history')
    def get_equipment_history(self, request, pk=None):
        """특정 장비의 이력 조회"""
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            equipment = self.get_object()
            history = EquipmentHistory.objects.filter(equipment=equipment).order_by('-created_at')
            serializer = EquipmentHistorySerializer(history, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"장비 이력 조회 중 오류: {e}")
            return Response({"detail": f"장비 이력 조회 중 오류가 발생했습니다: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        """장비 생성 시 이력 기록"""
        equipment = serializer.save()
        
        # 이력 기록
        EquipmentHistory.objects.create(
            equipment=equipment,
            action='CREATED',
            user=self.request.user,
            new_value={
                'asset_number': equipment.asset_number,
                'manufacturer': equipment.manufacturer,
                'model_name': equipment.model_name,
                'equipment_type': equipment.equipment_type,
                'serial_number': equipment.serial_number,
                'status': equipment.status,
                'acquisition_date': equipment.acquisition_date.isoformat() if equipment.acquisition_date else None,
                'manufacture_year': equipment.manufacture_year,
                'purchase_date': equipment.purchase_date.isoformat() if equipment.purchase_date else None,
                'purchase_price': str(equipment.purchase_price) if equipment.purchase_price else None,
                'management_number': equipment.management_number
            },
            details=f"장비 '{equipment.asset_number or equipment.model_name or equipment.serial_number}' 생성"
        )
        
        logger.info(f"장비 생성: {equipment.asset_number} by {self.request.user.username}")

    def perform_update(self, serializer):
        """장비 수정 시 이력 기록"""
        old_instance = Equipment.objects.get(pk=serializer.instance.pk)
        old_data = {
            'asset_number': old_instance.asset_number,
            'manufacturer': old_instance.manufacturer,
            'model_name': old_instance.model_name,
            'equipment_type': old_instance.equipment_type,
            'serial_number': old_instance.serial_number,
            'status': old_instance.status,
            'acquisition_date': old_instance.acquisition_date.isoformat() if old_instance.acquisition_date else None,
            'manufacture_year': old_instance.manufacture_year,
            'purchase_date': old_instance.purchase_date.isoformat() if old_instance.purchase_date else None,
            'purchase_price': str(old_instance.purchase_price) if old_instance.purchase_price else None,
            'management_number': old_instance.management_number
        }
        
        equipment = serializer.save()
        
        new_data = {
            'asset_number': equipment.asset_number,
            'manufacturer': equipment.manufacturer,
            'model_name': equipment.model_name,
            'equipment_type': equipment.equipment_type,
            'serial_number': equipment.serial_number,
            'status': equipment.status,
            'acquisition_date': equipment.acquisition_date.isoformat() if equipment.acquisition_date else None,
            'manufacture_year': equipment.manufacture_year,
            'purchase_date': equipment.purchase_date.isoformat() if equipment.purchase_date else None,
            'purchase_price': str(equipment.purchase_price) if equipment.purchase_price else None,
            'management_number': equipment.management_number
        }
        
        # 상태 변경 여부 확인
        action = 'STATUS_CHANGED' if old_data['status'] != new_data['status'] else 'UPDATED'
        
        # 이력 기록
        EquipmentHistory.objects.create(
            equipment=equipment,
            action=action,
            user=self.request.user,
            old_value=old_data,
            new_value=new_data,
            details=f"장비 '{equipment.asset_number or equipment.model_name or equipment.serial_number}' {action.lower()} by {self.request.user.username}"
        )
        
        logger.info(f"장비 수정: {equipment.asset_number} by {self.request.user.username}")

    def perform_destroy(self, instance):
        """장비 삭제 시 이력 기록"""
        # 삭제 전 데이터 저장
        old_data = {
            'asset_number': instance.asset_number,
            'manufacturer': instance.manufacturer,
            'model_name': instance.model_name,
            'equipment_type': instance.equipment_type,
            'serial_number': instance.serial_number,
            'status': instance.status,
            'acquisition_date': instance.acquisition_date.isoformat() if instance.acquisition_date else None,
            'manufacture_year': instance.manufacture_year,
            'purchase_date': instance.purchase_date.isoformat() if instance.purchase_date else None,
            'purchase_price': str(instance.purchase_price) if instance.purchase_price else None,
            'management_number': instance.management_number
        }
        
        # 이력 기록
        EquipmentHistory.objects.create(
            equipment=instance,
            action='DELETED',
            user=self.request.user,
            old_value=old_data,
            details=f"장비 '{instance.asset_number or instance.model_name or instance.serial_number}' 삭제 by {self.request.user.username}"
        )
        
        logger.info(f"장비 삭제: {instance.asset_number} by {self.request.user.username}")
        
        # 장비 삭제
        instance.delete()


class RentalViewSet(viewsets.ModelViewSet):
    """
    대여 정보 관리 API
    """
    queryset = Rental.objects.all()
    serializer_class = RentalSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['equipment__asset_number', 'equipment__serial_number', 'user__username']
    ordering_fields = ['rental_date', 'due_date', 'return_date', 'status']
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    
    def get_permissions(self):
        """
        액션별로 권한 설정:
        - 관리자는 모든 권한
        - 일반 사용자는 자신의 대여 정보만 접근 가능
        """
        logger = logging.getLogger('rentals')
        logger.debug(f"get_permissions 호출됨: action={self.action}, method={self.request.method}")
        
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            logger.debug("관리자 권한 필요")
            return [permissions.IsAdminUser()]
        logger.debug("인증된 사용자 권한")
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return Rental.objects.all()
        return Rental.objects.filter(user=user)
    
    def create(self, request, *args, **kwargs):
        """대여 정보 생성"""
        logger = logging.getLogger('rentals')
        logger.debug(f"create 메서드 호출됨: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"유효성 검사 오류: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # 장비 상태 체크
                equipment = serializer.validated_data.get('equipment')
                if equipment.status != 'AVAILABLE':
                    logger.warning(f"대여 불가능한 장비: {equipment.id}, 상태: {equipment.status}")
                    return Response(
                        {"detail": f"대여할 수 없는 장비입니다. 현재 상태: {equipment.get_status_display()}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 사용자의 기존 대여 기록 확인
                user = serializer.validated_data.get('user', request.user)
                existing_rentals = Rental.objects.filter(
                    user=user,
                    equipment=equipment,
                    status__in=['RENTED', 'OVERDUE']
                ).order_by('-rental_date')
                
                # 기존 대여 기록이 있는 경우 반납 처리
                if existing_rentals.exists():
                    for rental in existing_rentals:
                        rental.status = 'RETURNED'
                        rental.return_date = timezone.now()
                        rental.returned_to = request.user if request.user.is_staff else None
                        rental.save()
                
                # 장비 상태 업데이트
                equipment.status = 'RENTED'
                equipment.save()
                
                # 새 대여 정보 생성
                rental = serializer.save(
                    user=user,
                    approved_by=request.user if request.user.is_staff else None
                )
                
                # 장비 대여 이력 기록
                EquipmentHistory.objects.create(
                    equipment=equipment,
                    action='RENTED',
                    user=request.user,
                    new_value={
                        'rental_id': rental.id,
                        'user_id': user.id,
                        'username': user.username,
                        'rental_date': rental.rental_date.isoformat(),
                        'due_date': rental.due_date.isoformat(),
                        'status': 'RENTED'
                    },
                    details=f"장비 '{equipment.asset_number or equipment.model_name or equipment.serial_number}' 대여 to {user.username}"
                )
                
                logger.info(f"대여 생성 성공: {rental.id}")
                return Response({
                    "success": True,
                    "data": serializer.data,
                    "message": "대여가 성공적으로 생성되었습니다."
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"대여 생성 중 오류: {e}")
            return Response(
                {"detail": f"대여 생성 중 오류가 발생했습니다: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
        
        try:
            with transaction.atomic():
                # 현재 대여 기록 반납 처리
                rental.status = 'RETURNED'
                rental.return_date = timezone.now()
                rental.returned_to = request.user if request.user.is_staff else None
                rental.save()
                
                # 장비 상태 업데이트
                equipment = rental.equipment
                
                # 해당 장비의 다른 대여 기록 확인
                other_active_rentals = Rental.objects.filter(
                    equipment=equipment,
                    status__in=['RENTED', 'OVERDUE']
                ).exclude(id=rental.id)
                
                # 다른 활성 대여가 없는 경우에만 장비 상태를 'AVAILABLE'로 변경
                if not other_active_rentals.exists():
                    equipment.status = 'AVAILABLE'
                    equipment.save()
                    
                    # 장비 반납 이력 기록
                    EquipmentHistory.objects.create(
                        equipment=equipment,
                        action='RETURNED',
                        user=request.user,
                        old_value={
                            'rental_id': rental.id,
                            'user_id': rental.user.id,
                            'username': rental.user.username,
                            'status': 'RENTED'
                        },
                        new_value={
                            'status': 'AVAILABLE',
                            'return_date': rental.return_date.isoformat(),
                            'returned_to': request.user.username if request.user.is_staff else None
                        },
                        details=f"장비 '{equipment.asset_number or equipment.model_name or equipment.serial_number}' 반납 from {rental.user.username}"
                    )
                
                serializer = self.get_serializer(rental)
                return Response({
                    "success": True,
                    "data": serializer.data,
                    "message": "장비가 성공적으로 반납되었습니다."
                })
        except Exception as e:
            return Response(
                {"detail": f"반납 처리 중 오류가 발생했습니다: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RentalRequestViewSet(viewsets.ModelViewSet):
    """
    대여/반납 요청 관리 API
    """
    queryset = RentalRequest.objects.all()
    serializer_class = RentalRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['equipment__asset_number', 'user__username', 'reason']
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
                
            # 중복된 대여 기록 정리
            duplicate_rentals = Rental.objects.filter(
                user=rental_request.user,
                equipment=equipment,
                status__in=['RENTED', 'OVERDUE']
            ).order_by('-rental_date')
            
            if duplicate_rentals.exists():
                # 가장 최근 기록을 제외한 나머지 삭제
                latest_rental = duplicate_rentals.first()
                duplicate_rentals.exclude(id=latest_rental.id).delete()
                logger.info(f"중복된 대여 기록 정리 완료: 장비={equipment.id}, 사용자={rental_request.user.id}")
                
                # 기존 대여 기록 반납 처리
                latest_rental.status = 'RETURNED'
                latest_rental.return_date = timezone.now()
                latest_rental.returned_to = request.user
                latest_rental.save()
            
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
                    
                # 중복된 대여 기록 정리
                duplicate_rentals = Rental.objects.filter(
                    user=rental_request.user,
                    equipment=equipment,
                    status__in=['RENTED', 'OVERDUE']
                ).order_by('-rental_date')
                
                if duplicate_rentals.exists():
                    # 가장 최근 기록을 제외한 나머지 삭제
                    latest_rental = duplicate_rentals.first()
                    duplicate_rentals.exclude(id=latest_rental.id).delete()
                    logger.info(f"중복된 대여 기록 정리 완료: 장비={equipment.id}, 사용자={rental_request.user.id}")
                
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
                # 중복된 대여 기록 정리 후 가장 최근 대여 정보 검색
                rentals = Rental.objects.filter(
                    user=rental_request.user,
                    equipment=rental_request.equipment,
                    status__in=['RENTED', 'OVERDUE']
                ).order_by('-rental_date')
                
                if not rentals.exists():
                    return Response(
                        {"detail": "대여 중인 장비를 찾을 수 없습니다."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 가장 최근 대여 기록만 남기고 나머지 삭제
                rental = rentals.first()
                rentals.exclude(id=rental.id).delete()
                logger.info(f"중복된 대여 기록 정리 완료: 장비={rental_request.equipment.id}, 사용자={rental_request.user.id}")
                    
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
            return Response({
                "success": True,
                "data": serializer.data,
                "message": f"요청이 성공적으로 {action}되었습니다."
            })
        
        # 거부 처리
        elif action == 'reject':
            rental_request.status = 'REJECTED'
            rental_request.processed_by = request.user
            rental_request.processed_at = timezone.now()
            
            # 거부 사유가 있으면 저장
            if reason:
                rental_request.reject_reason = reason
            
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
        
        wb = Workbook()
        ws = wb.active
        ws.title = "대여/반납 요청 내역"
        
        # 헤더 스타일 설정
        header_font = Font(bold=True)
        header_alignment = Alignment(horizontal='center')
        
        # 컬럼 헤더 설정
        columns = ['ID', '사용자', '요청 유형', '장비명', '요청일', '상태', '처리자', '처리일']
        for col_num, column_title in enumerate(columns, 1):
            cell = ws.cell(row=1, column=col_num, value=column_title)
            cell.font = header_font
            cell.alignment = header_alignment
        
        # 데이터 입력
        for row_num, req in enumerate(request_list, 2):
            ws.cell(row=row_num, column=1, value=req.id)
            ws.cell(row=row_num, column=2, value=req.user.username)
            ws.cell(row=row_num, column=3, value=req.get_request_type_display())
            ws.cell(row=row_num, column=4, value=req.equipment.asset_number)
            ws.cell(row=row_num, column=5, value=str(req.requested_date))
            ws.cell(row=row_num, column=6, value=req.get_status_display())
            ws.cell(row=row_num, column=7, value=req.processed_by.username if req.processed_by else "미처리")
            ws.cell(row=row_num, column=8, value=str(req.processed_at) if req.processed_at else "미처리")
        
        # 컬럼 너비 자동 조정
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = (max_length + 2)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # 파일 저장
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="rental_requests.xlsx"'
        
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
