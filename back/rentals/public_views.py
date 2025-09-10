from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch
from .models import Equipment, Rental, EquipmentHistory
from .serializers import PublicEquipmentSerializer, PublicRentalSerializer, PublicEquipmentHistorySerializer
import logging

logger = logging.getLogger(__name__)


class PublicEquipmentView(APIView):
    """
    공개 장비 조회 API - 일련번호로 장비 정보와 대여이력 조회
    인증 없이 접근 가능
    """
    permission_classes = [AllowAny]
    
    def get(self, request, serial_number):
        """
        일련번호로 장비 정보와 대여이력 조회
        
        Args:
            serial_number: 장비의 일련번호
            
        Returns:
            장비 정보와 대여이력이 포함된 응답
        """
        try:
            # 일련번호로 장비 조회 (대여이력 포함)
            try:
                equipment = Equipment.objects.prefetch_related(
                    Prefetch(
                        'rentals',
                        queryset=Rental.objects.select_related('user').order_by('-rental_date'),
                        to_attr='all_rentals'
                    ),
                    Prefetch(
                        'histories',
                        queryset=EquipmentHistory.objects.order_by('-created_at'),
                        to_attr='equipment_history'
                    )
                ).get(serial_number=serial_number)
            except Equipment.DoesNotExist:
                logger.warning(f"장비를 찾을 수 없음: 일련번호={serial_number}")
                return Response({
                    'success': False,
                    'message': '해당 일련번호의 장비를 찾을 수 없습니다.',
                    'serial_number': serial_number
                }, status=status.HTTP_404_NOT_FOUND)
            
            # 장비 정보 직렬화
            equipment_data = PublicEquipmentSerializer(equipment).data
            
            # 대여이력 직렬화
            rental_data = PublicRentalSerializer(equipment.all_rentals, many=True).data
            
            # 장비 이력 직렬화
            history_data = PublicEquipmentHistorySerializer(equipment.equipment_history, many=True).data
            
            response_data = {
                'success': True,
                'equipment': equipment_data,
                'rental_history': rental_data,
                'equipment_history': history_data,
                'total_rentals': len(rental_data),
                'total_history_entries': len(history_data)
            }
            
            logger.info(f"공개 장비 조회 성공: 일련번호={serial_number}, 대여횟수={len(rental_data)}")
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Equipment.DoesNotExist:
            logger.warning(f"장비를 찾을 수 없음: 일련번호={serial_number}")
            return Response({
                'success': False,
                'message': '해당 일련번호의 장비를 찾을 수 없습니다.',
                'serial_number': serial_number
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"공개 장비 조회 중 오류: {e}")
            return Response({
                'success': False,
                'message': '장비 정보 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PublicEquipmentStatusView(APIView):
    """
    공개 장비 상태 조회 API - 간단한 장비 상태 정보만 제공
    """
    permission_classes = [AllowAny]
    
    def get(self, request, serial_number):
        """
        일련번호로 장비의 기본 상태 정보만 조회
        
        Args:
            serial_number: 장비의 일련번호
            
        Returns:
            장비의 기본 상태 정보
        """
        try:
            equipment = get_object_or_404(
                Equipment.objects.select_related(),
                serial_number=serial_number
            )
            
            # 현재 대여 중인지 확인
            current_rental = Rental.objects.filter(
                equipment=equipment,
                status='RENTED'
            ).select_related('user').first()
            
            response_data = {
                'success': True,
                'serial_number': equipment.serial_number,
                'asset_number': equipment.asset_number,
                'manufacturer': equipment.manufacturer,
                'model_name': equipment.model_name,
                'equipment_type': equipment.equipment_type,
                'equipment_type_display': equipment.get_equipment_type_display(),
                'status': equipment.status,
                'status_display': equipment.get_status_display(),
                'management_number': equipment.management_number,
                'is_rented': current_rental is not None,
                'current_renter': {
                    'username': current_rental.user.username,
                    'name': f"{current_rental.user.last_name or ''} {current_rental.user.first_name or ''}".strip() or current_rental.user.username,
                    'rental_date': current_rental.rental_date,
                    'due_date': current_rental.due_date
                } if current_rental else None
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Equipment.DoesNotExist:
            return Response({
                'success': False,
                'message': '해당 일련번호의 장비를 찾을 수 없습니다.',
                'serial_number': serial_number
            }, status=status.HTTP_404_NOT_FOUND)
            
        except Exception as e:
            logger.error(f"공개 장비 상태 조회 중 오류: {e}")
            return Response({
                'success': False,
                'message': '장비 상태 조회 중 오류가 발생했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
