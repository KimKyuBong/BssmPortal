from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
import re
import logging
import subprocess
import re

from ..models import Device, DeviceHistory
from ..serializers import DeviceSerializer, DeviceDetailSerializer
from ..utils.kea_client import KeaClient
from ..permissions import IsSuperUser, IsStaffUser, IsOwnerOrStaff

logger = logging.getLogger(__name__)

class DeviceViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DeviceDetailSerializer
        return DeviceSerializer

    def get_queryset(self):
        # 관리자는 모든 장치 조회 가능
        if self.request.user.is_superuser:
            return Device.objects.all()
        # 교사는 모든 장치 조회 가능
        elif self.request.user.is_staff:
            return Device.objects.all()
        # 일반 사용자는 자신의 장치만 조회 가능
        return Device.objects.filter(user=self.request.user)
    
    def get_permissions(self):
        # 데코레이터에서 특별히 권한이 설정되지 않은 액션들에 대한 기본 권한
        # (create, list, retrieve, update, partial_update, destroy)
        if self.action in ['update', 'partial_update']:
            return [IsSuperUser()]
        elif self.action in ['history']:
            return [IsStaffUser()]
        elif self.action == 'destroy':
            return [IsOwnerOrStaff()]  # 소유자 또는 관리자만 삭제 가능
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my(self, request):
        """내 기기만 조회"""
        devices = Device.objects.filter(user=request.user)
        serializer = self.get_serializer(devices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsSuperUser])
    def all(self, request):
        """모든 기기 조회 (관리자용)"""
        devices = Device.objects.all()
        serializer = self.get_serializer(devices, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        device = serializer.save(user=self.request.user)
        
        # IP 주소가 없는 경우 자동 할당
        if not device.assigned_ip:
            # 현재 사용 중인 IP 목록 가져오기
            used_ips = list(Device.objects.values_list('assigned_ip', flat=True))
            
            # 학생 계정인지 확인
            is_student = not self.request.user.is_staff
            
            # 사용 가능한 IP 찾기 (학생 계정 여부에 따라 다른 IP 대역 사용)
            assigned_ip = KeaClient.find_available_ip(existing_ips=used_ips, is_student=is_student)
                
            if not assigned_ip:
                raise ValidationError({"assigned_ip": "사용 가능한 IP 주소가 없습니다."})
                
            logger.info(f"자동 할당된 IP 주소: {assigned_ip} (학생 계정: {is_student})")
            
            # 할당된 IP 주소 저장
            device.assigned_ip = assigned_ip
            device.save()
        
        # 이력 기록
        DeviceHistory.objects.create(
            user=self.request.user,
            mac_address=device.mac_address,
            device_name=device.device_name,
            assigned_ip=device.assigned_ip,
            action='REGISTER'
        )
        
        # KEA DHCP 서버에 IP 할당 등록
        KeaClient.register_ip_to_kea(device.mac_address, device.assigned_ip, device.device_name)

    def perform_update(self, serializer):
        old_data = DeviceSerializer(serializer.instance).data
        device = serializer.save()
        # 이력 기록
        DeviceHistory.objects.create(
            user=self.request.user,
            mac_address=device.mac_address,
            device_name=device.device_name,
            assigned_ip=device.assigned_ip,
            action='UPDATE'
        )

    def perform_destroy(self, instance):
        """장치 삭제 시 KEA DHCP 서버의 호스트 설정도 함께 삭제"""
        # 권한 확인: 관리자이거나 자신의 장치만 삭제 가능
        if not self.request.user.is_superuser and instance.user != self.request.user:
            raise ValidationError({"detail": "자신의 장치만 삭제할 수 있습니다."})
            
        try:
            # 삭제 이력 기록
            DeviceHistory.objects.create(
                user=self.request.user,
                mac_address=instance.mac_address,
                device_name=instance.device_name,
                assigned_ip=instance.assigned_ip,
                action='UNREGISTER'
            )
            
            # KEA DHCP 서버에서 IP 할당 제거
            KeaClient.remove_ip_from_kea(instance.mac_address, instance.assigned_ip)

            # 장치 삭제
            instance.delete()
            logger.info(f"장치 {instance.mac_address} 삭제 완료")
        except Exception as e:
            logger.error(f"장치 삭제 중 오류 발생: {e}")
            # 구체적인 에러 메시지 포함하여 예외 발생
            raise ValidationError({"detail": f"장치 삭제 중 오류가 발생했습니다: {str(e)}"})

    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def reassign_ip(self, request, pk=None):
        device = self.get_object()
        old_ip = device.assigned_ip
        
        # 현재 사용 중인 IP 목록 가져오기 (제외할 장치 ID 제외)
        used_ips = list(Device.objects.exclude(id=device.id).values_list('assigned_ip', flat=True))
        
        # 학생 계정인지 확인
        is_student = not request.user.is_staff
        
        # 새로운 IP 할당 (학생/교사 구분하여 다른 IP 대역 사용)
        new_ip = KeaClient.find_available_ip(existing_ips=used_ips, is_student=is_student)
        
        if not new_ip:
            return Response(
                {"error": "사용 가능한 IP 주소가 없습니다."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # 기존 IP 할당 제거
        KeaClient.remove_ip_from_kea(device.mac_address)
        
        # 새 IP 할당
        if KeaClient.register_ip_to_kea(device.mac_address, new_ip, device.device_name):
            device.assigned_ip = new_ip
            device.save()
            
            # 이력 기록
            DeviceHistory.objects.create(
                user=request.user,
                mac_address=device.mac_address,
                device_name=device.device_name,
                assigned_ip=new_ip,
                action='REASSIGN_IP',
                old_value={'ip': old_ip},
                new_value={'ip': new_ip}
            )
            
            return Response({
                "message": "IP 재할당 성공",
                "old_ip": old_ip,
                "new_ip": new_ip
            })
        else:
            return Response(
                {"error": "IP 재할당에 실패했습니다."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsSuperUser])
    def toggle_active(self, request, pk=None):
        device = self.get_object()
        old_status = device.is_active
        device.is_active = not device.is_active
        
        try:
            if not device.is_active:  # 비활성화로 변경된 경우
                # 1. 기존 IP 주소 기록
                old_ip = device.assigned_ip
                
                # 2. 기존 DHCP 할당 제거
                remove_result = KeaClient.remove_ip_from_kea(device.mac_address)
                if not remove_result:
                    logger.error(f"장치 {device.mac_address}의 DHCP 할당 제거 실패")
                    # 계속 진행 - 임시 IP 할당 시도
                
                logger.info(f"장치 {device.mac_address}의 DHCP 할당이 제거되었습니다.")
                
                # 3. 임시 IP 할당
                temp_ip = KeaClient.assign_temporary_ip(device.mac_address, device.device_name, device.id)
                
                if not temp_ip:
                    logger.error("임시 IP 할당에 실패했습니다.")
                    # 실패 시 원래 상태로 복원
                    device.is_active = old_status
                    return Response({"error": "임시 IP 할당에 실패했습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                # 4. 장치 정보 업데이트 - 임시 IP로 설정
                device.assigned_ip = temp_ip
                
                # 5. 이력 기록 - 'DEACTIVATE' 대신 'UNREGISTER' 사용
                DeviceHistory.objects.create(
                    user=request.user,
                    mac_address=device.mac_address,
                    device_name=device.device_name,
                    assigned_ip=temp_ip,
                    action='UNREGISTER'
                )
            else:  # 활성화로 변경된 경우
                # 1. 임시 IP 할당 제거
                old_ip = device.assigned_ip
                remove_result = KeaClient.remove_ip_from_kea(device.mac_address)
                if not remove_result:
                    logger.error(f"장치 {device.mac_address}의 임시 IP 할당 제거 실패")
                    # 계속 진행 - 새 IP 할당 시도
                
                # 2. 새로운 IP 할당
                used_ips = list(Device.objects.exclude(id=device.id).values_list('assigned_ip', flat=True))
                new_ip = KeaClient.find_available_ip(existing_ips=used_ips)
                    
                if not new_ip:
                    logger.error("사용 가능한 IP 주소가 없습니다.")
                    # 실패 시 원래 상태로 복원
                    device.is_active = old_status
                    return Response({"error": "사용 가능한 IP 주소가 없습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                # 3. 새 IP로 DHCP 할당
                register_result = KeaClient.register_ip_to_kea(device.mac_address, new_ip, device.device_name)
                if not register_result:
                    # 실패 시 원래 상태로 복원하고 오류 반환
                    logger.error(f"장치 {device.mac_address}에 새 IP {new_ip} 할당 실패")
                    device.is_active = old_status
                    return Response({"error": "새 IP 할당에 실패했습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                logger.info(f"장치 {device.mac_address}에 새 IP {new_ip}가 할당되었습니다.")
                
                # 4. 장치 정보 업데이트
                device.assigned_ip = new_ip
                
                # 5. 이력 기록 - 'ACTIVATE' 대신 'REGISTER' 사용
                DeviceHistory.objects.create(
                    user=request.user,
                    mac_address=device.mac_address,
                    device_name=device.device_name,
                    assigned_ip=new_ip,
                    action='REGISTER'
                )
        except Exception as e:
            # 오류 발생 시 원래 상태로 복원
            device.is_active = old_status
            logger.error(f"DHCP 할당 처리 중 오류 발생: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 변경사항 저장
        device.save()
        
        return Response({
            'status': 'success',
            'is_active': device.is_active,
            'assigned_ip': device.assigned_ip
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def register_manual(self, request):
        """MAC 주소 수동 등록"""
        mac_address = request.data.get('mac_address')
        device_name = request.data.get('device_name')
        
        logger.info(f"장치 등록 요청: MAC={mac_address}, 이름={device_name}, 사용자={request.user.username}")
        
        # MAC 주소 형식 검증
        if not mac_address or not re.match(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$', mac_address):
            logger.warning(f"유효하지 않은 MAC 주소 형식: {mac_address}")
            return Response({
                'success': False,
                'message': '유효하지 않은 MAC 주소 형식입니다.',
                'error_code': 'INVALID_MAC_FORMAT'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # 장치 이름 검증
        if not device_name:
            logger.warning(f"장치 이름이 제공되지 않음: 사용자={request.user.username}")
            return Response({
                'success': False,
                'message': '장치 이름을 입력해주세요.',
                'error_code': 'EMPTY_DEVICE_NAME'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # 이미 등록된 MAC 주소인지 확인
        if Device.objects.filter(mac_address=mac_address).exists():
            existing_device = Device.objects.get(mac_address=mac_address)
            logger.warning(f"중복된 MAC 주소 등록 시도: MAC={mac_address}, 기존 소유자={existing_device.user.username}")
            return Response({
                'success': False,
                'message': '이미 등록된 MAC 주소입니다.',
                'error_code': 'DUPLICATE_MAC_ADDRESS',
                'owner': existing_device.user.username
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # 사용자 장치 수 제한 확인
        user_devices = Device.objects.filter(user=request.user).count()
        if user_devices >= 3:
            logger.warning(f"장치 등록 제한 초과: 사용자={request.user.username}, 현재 장치 수={user_devices}")
            return Response({
                'success': False,
                'message': '최대 3개의 장치만 등록할 수 있습니다.',
                'error_code': 'MAX_DEVICES_REACHED',
                'current_count': user_devices
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # 새 IP 주소 할당
        used_ips = list(Device.objects.values_list('assigned_ip', flat=True))
        
        # 학생 계정인지 확인
        is_student = not request.user.is_staff
        
        # IP 할당 (학생/교사 계정에 따라 다른 대역 사용)
        assigned_ip = KeaClient.find_available_ip(existing_ips=used_ips, is_student=is_student)
                
        if not assigned_ip:
            logger.error(f"사용 가능한 IP 주소가 없음")
            return Response({
                'success': False,
                'message': '사용 가능한 IP 주소가 없습니다.',
                'error_code': 'NO_AVAILABLE_IP'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        logger.info(f"할당된 IP 주소: {assigned_ip}")
            
        # 장치 등록
        try:
            device = Device.objects.create(
                user=request.user,
                mac_address=mac_address,
                assigned_ip=assigned_ip,
                device_name=device_name
            )
            logger.info(f"장치 등록 성공: MAC={mac_address}, IP={assigned_ip}, 사용자={request.user.username}")
        except Exception as e:
            logger.error(f"장치 등록 중 오류 발생: {e}")
            return Response({
                'success': False,
                'message': f'장치 등록 중 오류가 발생했습니다: {str(e)}',
                'error_code': 'DEVICE_CREATION_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # KEA DHCP 서버에 IP 할당 등록
        KeaClient.register_ip_to_kea(mac_address, assigned_ip, device_name)
        
        # 장치 등록 이력 기록
        try:
            DeviceHistory.objects.create(
                user=request.user,
                mac_address=mac_address,
                device_name=device_name,
                assigned_ip=assigned_ip,
                action='REGISTER'
            )
            logger.info(f"장치 등록 이력 기록 완료: MAC={mac_address}")
        except Exception as e:
            logger.error(f"장치 이력 기록 중 오류 발생: {e}")
            # 이력 기록 오류는 무시하고 계속 진행
        
        return Response({
            'success': True,
            'message': '장치가 성공적으로 등록되었습니다.',
            'device': DeviceSerializer(device).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        total_devices = Device.objects.count()
        active_devices = Device.objects.filter(is_active=True).count()
        user_devices = Device.objects.filter(user=request.user).count()
        
        return Response({
            'total_devices': total_devices,
            'active_devices': active_devices,
            'user_devices': user_devices
        }) 
    
    @action(detail=False, methods=['get'], url_path='current-mac', permission_classes=[IsAuthenticated])
    def get_current_mac(self, request):
        """현재 IP 주소의 MAC 주소를 가져옵니다."""
        try:
            # 요청 헤더 로깅
            logger.info("Request headers: %s", request.META)
            
            # X-Real-IP 또는 X-Forwarded-For 헤더에서 실제 클라이언트 IP 가져오기
            client_ip = request.META.get('HTTP_X_REAL_IP') or request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            if not client_ip:
                client_ip = request.META.get('REMOTE_ADDR')
                
            logger.info("Client IP: %s", client_ip)

            # ARP 명령어 사용 부분 삭제 - Docker 컨테이너에 arp 명령이 없어서 오류 발생
            
            # KEA DHCP 서버에서 MAC 주소 조회
            logger.info("Trying to get MAC from KEA DHCP server...")
            mac_address = KeaClient.get_mac_from_ip(client_ip)
            logger.info("MAC address from KEA DHCP: %s", mac_address)

            if mac_address:
                logger.info("Returning MAC address: %s for IP: %s", mac_address, client_ip)
                # 중첩된 구조 제거: 'data' 객체 안에 데이터를 넣지 않고 직접 반환
                return Response({
                    'success': True,
                    'ip_address': client_ip,
                    'mac_address': mac_address
                })
            else:
                logger.warning("MAC address not found for IP: %s", client_ip)
                # 중첩된 구조 제거: 'data' 객체 안에 데이터를 넣지 않고 직접 반환
                return Response({
                    'success': False,
                    'message': 'MAC 주소를 찾을 수 없습니다.',
                    'ip_address': client_ip,
                    'mac_address': '00:00:00:00:00:00'
                })

        except Exception as e:
            logger.error("Error in get_current_mac: %s", str(e), exc_info=True)
            # 중첩된 구조 제거: 'data' 객체 안에 데이터를 넣지 않고 직접 반환
            return Response({
                'success': False,
                'message': str(e),
                'ip_address': client_ip if 'client_ip' in locals() else 'unknown',
                'mac_address': '00:00:00:00:00:00'
            }, status=500) 
        
    @action(detail=False, methods=['post'], permission_classes=[IsSuperUser])
    def blacklist_ip(self, request):
        """IP 주소를 블랙리스트에 추가합니다. (관리자 전용)"""
        ip_address = request.data.get('ip_address')
        if not ip_address:
            return Response({"error": "IP 주소가 제공되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        # IP 주소 형식 검증
        if not re.match(r'^(\d{1,3}\.){3}\d{1,3}$', ip_address):
            return Response({"error": "유효하지 않은 IP 주소 형식입니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 블랙리스트에 추가
        result = KeaClient.add_to_blacklist(ip_address)
        
        if result:
            # 이 IP를 사용 중인 장치 찾기
            devices = Device.objects.filter(assigned_ip=ip_address)
            
            # 찾은 장치의 IP 재할당
            for device in devices:
                old_ip = device.assigned_ip
                
                # 현재 사용 중인 IP 목록 (해당 장치 제외)
                used_ips = list(Device.objects.exclude(id=device.id).values_list('assigned_ip', flat=True))
                
                # 사용자 유형에 따라 IP 대역 결정
                is_student = not device.user.is_staff
                
                # 새 IP 할당
                new_ip = KeaClient.find_available_ip(existing_ips=used_ips, is_student=is_student)
                
                if new_ip:
                    # 새 IP 등록
                    KeaClient.register_ip_to_kea(device.mac_address, new_ip, device.device_name)
                    
                    # 장치 업데이트
                    device.assigned_ip = new_ip
                    device.save()
                    
                    # 이력 기록
                    DeviceHistory.objects.create(
                        user=request.user,
                        mac_address=device.mac_address,
                        device_name=device.device_name,
                        assigned_ip=new_ip,
                        action='REASSIGN_IP_BLACKLIST',
                        old_value={'ip': old_ip},
                        new_value={'ip': new_ip, 'reason': 'IP blacklisted'}
                    )
                    
                    logger.info(f"블랙리스트로 인해 장치 {device.mac_address}의 IP가 {old_ip}에서 {new_ip}로 변경되었습니다.")
            
            return Response({
                "message": f"IP 주소 {ip_address}가 블랙리스트에 추가되었습니다.",
                "affected_devices": devices.count()
            })
        else:
            return Response({"error": "IP 주소를 블랙리스트에 추가하는데 실패했습니다."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], permission_classes=[IsSuperUser])
    def unblacklist_ip(self, request):
        """IP 주소를 블랙리스트에서 제거합니다. (관리자 전용)"""
        ip_address = request.data.get('ip_address')
        if not ip_address:
            return Response({"error": "IP 주소가 제공되지 않았습니다."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 블랙리스트에서 제거
        result = KeaClient.remove_from_blacklist(ip_address)
        
        if result:
            return Response({
                "message": f"IP 주소 {ip_address}가 블랙리스트에서 제거되었습니다."
            })
        else:
            return Response({"error": "IP 주소가 블랙리스트에 없거나 제거하는데 실패했습니다."}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsSuperUser])
    def blacklisted_ips(self, request):
        """블랙리스트된 IP 주소 목록을 가져옵니다. (관리자 전용)"""
        blacklisted_ips = KeaClient.get_blacklisted_ips()
        
        return Response({
            "count": len(blacklisted_ips),
            "blacklisted_ips": blacklisted_ips
        }) 
        