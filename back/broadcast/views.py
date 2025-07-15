from django.shortcuts import render
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
from django.http import FileResponse, Http404
import logging
import os
import uuid
import requests
import io
import wave
import struct
import math
import base64
import json
from datetime import datetime, timedelta

from .models import DeviceMatrix, BroadcastHistory, AudioFile, BroadcastSchedule, BroadcastPreview
from .services import BroadcastService
from .serializers import (
    DeviceMatrixSerializer, 
    BroadcastHistorySerializer, 
    AudioFileSerializer,
    BroadcastScheduleSerializer,
    TextBroadcastSerializer,
    AudioBroadcastSerializer,
    BroadcastPreviewSerializer,
    PreviewResponseSerializer,
    PreviewApprovalSerializer,
    AudioPreviewSerializer
)
from core.permissions import IsTeacherUser

logger = logging.getLogger(__name__)

def parse_target_rooms_from_formdata(target_rooms_data):
    """FormData에서 target_rooms를 안전하게 배열로 변환"""
    if not target_rooms_data:
        return []
    
    if isinstance(target_rooms_data, list):
        return target_rooms_data
    
    if isinstance(target_rooms_data, str):
        try:
            return json.loads(target_rooms_data)
        except (json.JSONDecodeError, TypeError):
            return []
    
    return []

class DeviceMatrixView(APIView):
    """장치 매트릭스 관련 뷰 - 4행 16열 매트릭스 반환"""
    permission_classes = []  # 인증 제거
    
    def get(self, request):
        """4행 16열 장치 매트릭스 조회 - 방송 서버에서 실시간 데이터 가져오기"""
        try:
            # 방송 서버에서 실시간 장치 매트릭스 가져오기
            broadcast_server_url = "http://10.129.55.251:10200/api/device-matrix/"
            
            import requests
            response = requests.get(broadcast_server_url, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"방송 서버 장치 매트릭스 조회 실패: {response.status_code}")
                return Response({
                    'success': False,
                    'message': '방송 서버에서 장치 정보를 가져올 수 없습니다.',
                    'error': f'방송 서버 오류: {response.status_code}'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            broadcast_data = response.json()
            
            if not broadcast_data.get('success'):
                logger.error(f"방송 서버 응답 오류: {broadcast_data.get('message')}")
                return Response({
                    'success': False,
                    'message': '방송 서버에서 장치 정보를 가져올 수 없습니다.',
                    'error': broadcast_data.get('message', '알 수 없는 오류')
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # 방송 서버에서 받은 매트릭스 데이터를 그대로 사용
            matrix = broadcast_data.get('matrix', [])
            total_rows = broadcast_data.get('total_rows', 4)
            total_cols = broadcast_data.get('total_cols', 16)
            total_devices = broadcast_data.get('total_devices', 0)
            
            # 방송 서버 데이터를 Django 형식으로 변환
            converted_matrix = []
            for row in matrix:
                converted_row = []
                for device in row:
                    if device is None:
                        converted_row.append(None)
                    else:
                        converted_row.append({
                            'device_name': device.get('device_name', ''),
                            'room_id': device.get('room_id', 0),
                            'position_row': device.get('position', {}).get('row', 0),
                            'position_col': device.get('position', {}).get('col', 0),
                            'matrix_row': device.get('matrix_position', {}).get('row', 0),
                            'matrix_col': device.get('matrix_position', {}).get('col', 0),
                            'is_active': True  # 방송 서버에서 오는 장치는 모두 활성화된 것으로 간주
                        })
                converted_matrix.append(converted_row)
            
            return Response({
                'success': True,
                'message': '장치 매트릭스를 성공적으로 조회했습니다.',
                'matrix': converted_matrix,
                'total_rows': total_rows,
                'total_cols': total_cols,
                'total_devices': total_devices
            })
            
        except requests.exceptions.RequestException as e:
            logger.error(f"방송 서버 연결 실패: {e}")
            return Response({
                'success': False,
                'message': '방송 서버에 연결할 수 없습니다.',
                'error': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error(f"장치 매트릭스 조회 실패: {e}")
            return Response({
                'success': False,
                'message': '장치 매트릭스 조회에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """FastAPI에서 장치 매트릭스 동기화"""
        try:
            service = BroadcastService()
            success = service.sync_devices()
            
            if success:
                return Response({
                    'success': True,
                    'message': '장치 매트릭스 동기화가 완료되었습니다.'
                })
            else:
                return Response({
                    'success': False,
                    'message': '장치 매트릭스 동기화에 실패했습니다.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"장치 매트릭스 동기화 실패: {e}")
            return Response({
                'success': False,
                'message': '장치 매트릭스 동기화에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TextBroadcastView(APIView):
    """텍스트 방송 뷰 - 방송서버로 요청하여 프리뷰 생성"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def post(self, request):
        """방송서버로 텍스트 방송 요청하여 프리뷰 생성"""
        serializer = TextBroadcastSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': '입력 데이터가 유효하지 않습니다.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 방송서버 URL (실제 방송서버 주소)
            broadcast_server_url = "http://10.129.55.251:10200/api/broadcast/text"
            
            # 방송서버로 전송할 데이터 (form-data 형식)
            broadcast_data = {
                'text': serializer.validated_data['text'],
                'target_rooms': ','.join(map(str, serializer.validated_data.get('target_rooms', []))),
                'language': serializer.validated_data.get('language', 'ko'),
                'auto_off': serializer.validated_data.get('auto_off', False)
            }
            
            # 방송서버에 요청 (form-data 형식으로 전송)
            broadcast_response = requests.post(broadcast_server_url, data=broadcast_data, timeout=30)
            
            if broadcast_response.status_code != 200:
                # 방송서버 응답 내용 로깅
                logger.error(f"방송서버 에러 응답 상태: {broadcast_response.status_code}")
                logger.error(f"방송서버 에러 응답 헤더: {dict(broadcast_response.headers)}")
                logger.error(f"방송서버 에러 응답 내용: {broadcast_response.text}")
                
                # 방송서버에서 오는 실제 에러 메시지 추출
                error_message = '방송서버 연결에 실패했습니다.'
                try:
                    error_data = broadcast_response.json()
                    logger.error(f"방송서버 JSON 에러 데이터: {error_data}")
                    if error_data.get('message'):
                        error_message = error_data.get('message')
                    elif error_data.get('detail'):
                        error_message = error_data.get('detail')
                except Exception as json_error:
                    logger.error(f"방송서버 응답 JSON 파싱 실패: {json_error}")
                    # JSON이 아닌 경우 텍스트 내용을 그대로 사용
                    if broadcast_response.text:
                        error_message = broadcast_response.text.strip()
                
                logger.error(f"최종 에러 메시지: {error_message}")
                
                return Response({
                    'success': False,
                    'message': error_message,
                    'error': f'방송서버 오류: {broadcast_response.status_code}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            broadcast_data = broadcast_response.json()
            
            if not broadcast_data.get('success'):
                return Response({
                    'success': False,
                    'message': '방송서버에서 프리뷰 생성에 실패했습니다.',
                    'error': broadcast_data.get('message', '알 수 없는 오류')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # 방송서버에서 받은 프리뷰 정보로 Django 프리뷰 생성
            preview_info = broadcast_data.get('preview_info', {})
            
            preview = BroadcastPreview.objects.create(
                preview_id=preview_info.get('preview_id'),
                broadcast_type='text',
                content=serializer.validated_data['text'],
                target_rooms=serializer.validated_data.get('target_rooms', []),
                language=serializer.validated_data.get('language', 'ko'),
                auto_off=serializer.validated_data.get('auto_off', False),
                status='ready',
                created_by=request.user
            )
            
            # 방송서버에서 오디오 파일을 가져와서 base64로 인코딩
            audio_base64 = None
            try:
                audio_url = f"http://10.129.55.251:10200/api/broadcast/preview/audio/{preview_info.get('preview_id')}"
                audio_response = requests.get(audio_url, timeout=30)
                if audio_response.status_code == 200:
                    audio_base64 = base64.b64encode(audio_response.content).decode('utf-8')
                    logger.info(f"오디오 파일 base64 인코딩 완료: {len(audio_base64)} characters")
                else:
                    logger.warning(f"방송서버에서 오디오 파일을 가져올 수 없음: {audio_response.status_code}")
            except Exception as e:
                logger.error(f"오디오 파일 base64 인코딩 실패: {e}")
            
            # 방송서버에서 받은 프리뷰 정보를 정리하여 프론트로 전달
            return Response({
                'success': True,
                'status': 'preview_ready',
                'preview_info': {
                    'preview_id': preview_info.get('preview_id'),
                    'job_type': 'text',
                    'preview_url': f"/api/broadcast/preview/{preview_info.get('preview_id')}",
                    'estimated_duration': preview_info.get('estimated_duration', 0),
                    'created_at': preview.created_at.isoformat(),
                    'status': preview.status,
                    'audio_base64': audio_base64  # base64로 인코딩된 오디오 파일
                },
                'message': '텍스트 방송 프리뷰가 생성되었습니다. 확인 후 승인해주세요.',
                'timestamp': timezone.now().isoformat()
            })
            
        except requests.exceptions.RequestException as e:
            logger.error(f"방송서버 연결 실패: {e}")
            return Response({
                'success': False,
                'message': '방송서버에 연결할 수 없습니다.',
                'error': str(e)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error(f"텍스트 방송 프리뷰 생성 실패: {e}")
            return Response({
                'success': False,
                'message': '텍스트 방송 프리뷰 생성에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AudioBroadcastView(APIView):
    """오디오 방송 뷰 - 방송서버로 요청하여 프리뷰 생성"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """방송서버로 오디오 방송 요청하여 프리뷰 생성"""
        serializer = AudioBroadcastSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': '입력 데이터가 유효하지 않습니다.',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            audio_file = request.FILES.get('audio_file')
            if not audio_file:
                return Response({
                    'success': False,
                    'message': '오디오 파일이 필요합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 파일 크기 검증
            max_size = settings.BROADCAST_CONFIG['MAX_AUDIO_SIZE'] * 1024 * 1024
            if audio_file.size > max_size:
                return Response({
                    'success': False,
                    'message': f'파일 크기가 너무 큽니다. 최대 {settings.BROADCAST_CONFIG["MAX_AUDIO_SIZE"]}MB까지 허용됩니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 방송서버 URL (실제 방송서버 주소)
            broadcast_server_url = "http://10.129.55.251:10200/api/broadcast/audio"
            
            # 방송서버로 전송할 데이터 준비
            broadcast_data = {
                'auto_off': str(serializer.validated_data.get('auto_off', False)).lower()
            }
            
            # use_original 파라미터가 있으면 추가
            if request.data.get('use_original'):
                use_original_value = request.data.get('use_original')
                # 문자열을 boolean으로 변환
                if isinstance(use_original_value, str):
                    broadcast_data['use_original'] = use_original_value.lower() == 'true'
                else:
                    broadcast_data['use_original'] = bool(use_original_value)
            
            # target_rooms를 안전하게 배열로 변환
            target_rooms = parse_target_rooms_from_formdata(request.data.get('target_rooms', []))
            
            # target_rooms가 있으면 방송서버로 전송
            if target_rooms:
                broadcast_data['target_rooms'] = ','.join(map(str, target_rooms))
            
            # 오디오 파일 추가
            files = {'audio_file': (audio_file.name, audio_file, 'audio/mpeg')}
            
            # 방송서버에 요청 (form-data 형식으로 전송)
            broadcast_response = requests.post(broadcast_server_url, data=broadcast_data, files=files, timeout=30)
            
            if broadcast_response.status_code != 200:
                # 방송서버 응답 내용 로깅
                logger.error(f"방송서버 에러 응답 상태: {broadcast_response.status_code}")
                logger.error(f"방송서버 에러 응답 헤더: {dict(broadcast_response.headers)}")
                logger.error(f"방송서버 에러 응답 내용: {broadcast_response.text}")
                
                # 방송서버에서 오는 실제 에러 메시지 추출
                error_message = '방송서버 연결에 실패했습니다.'
                try:
                    error_data = broadcast_response.json()
                    if error_data.get('message'):
                        error_message = error_data.get('message')
                    elif error_data.get('detail'):
                        error_message = error_data.get('detail')
                except Exception:
                    if broadcast_response.text:
                        error_message = broadcast_response.text.strip()
                
                return Response({
                    'success': False,
                    'message': error_message
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            broadcast_data = broadcast_response.json()
            
            if not broadcast_data.get('success'):
                return Response({
                    'success': False,
                    'message': broadcast_data.get('message', '오디오 파일 재사용에 실패했습니다.')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # 프리뷰가 생성된 경우
            if broadcast_data.get('status') == 'preview_ready' and broadcast_data.get('preview_info'):
                preview_info = broadcast_data['preview_info']
                
                # 프리뷰 정보를 데이터베이스에 저장
                preview = BroadcastPreview.objects.create(
                    preview_id=preview_info['preview_id'],
                    broadcast_type='audio',
                    content=f"오디오 프리뷰: {preview_info.get('preview_id', 'Unknown')}",
                    target_rooms=target_rooms,
                    language=request.data.get('language', 'ko'),
                    auto_off=request.data.get('auto_off', False),
                    status='ready',
                    created_by=request.user
                )
                
                return Response({
                    'success': True,
                    'status': 'preview_ready',
                    'preview_info': {
                        'preview_id': preview.preview_id,
                        'broadcast_type': preview.broadcast_type,
                        'content': preview.content,
                        'created_at': preview.created_at.isoformat()
                    },
                    'message': '오디오 방송 프리뷰가 생성되었습니다. 확인 후 승인해주세요.',
                    'timestamp': timezone.now().isoformat()
                })
            else:
                return Response({
                    'success': False,
                    'message': '프리뷰 생성에 실패했습니다.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"오디오 방송 프리뷰 생성 실패: {e}")
            return Response({
                'success': False,
                'message': '오디오 방송 프리뷰 생성에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BroadcastHistoryView(APIView):
    """방송 이력 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def get(self, request):
        """방송 이력 조회"""
        try:
            limit = int(request.GET.get('limit', 20))
            
            # 서비스 함수 사용
            from .services import BroadcastService
            service = BroadcastService()
            
            # 사용자별 방송 이력 조회 - 모든 사용자는 자신의 이력만 조회
            history = service.get_broadcast_history_by_user(request.user, limit=limit)
            
            return Response({
                'success': True,
                'history': history,
                'total_count': len(history),
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"방송 이력 조회 실패: {e}")
            return Response({
                'success': False,
                'message': '방송 이력을 조회할 수 없습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, history_id):
        """방송 이력 삭제"""
        try:
            # 방송 이력 조회
            history_item = get_object_or_404(BroadcastHistory, id=history_id)
            
            # 권한 확인 - 자신의 이력만 삭제 가능
            if history_item.broadcasted_by != request.user and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '자신의 방송 이력만 삭제할 수 있습니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 관련 프리뷰가 있으면 함께 삭제
            if history_item.preview:
                history_item.preview.delete()
                logger.info(f"방송 이력 {history_id}와 관련 프리뷰 삭제 완료")
            
            # 방송 이력 삭제
            history_item.delete()
            
            return Response({
                'success': True,
                'message': '방송 이력이 성공적으로 삭제되었습니다.',
                'timestamp': timezone.now().isoformat()
            })
            
        except BroadcastHistory.DoesNotExist:
            return Response({
                'success': False,
                'message': '해당 방송 이력을 찾을 수 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"방송 이력 삭제 실패: {e}")
            return Response({
                'success': False,
                'message': '방송 이력 삭제에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BroadcastHistoryDetailView(APIView):
    """방송 이력 상세 조회 뷰 (오디오 base64 포함)"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def get(self, request, history_id):
        """특정 방송 이력 상세 조회 (오디오 base64 포함)"""
        try:
            # 방송 이력 조회
            history_item = get_object_or_404(BroadcastHistory, id=history_id)
            
            # 권한 확인 - 자신의 이력만 조회 가능
            if history_item.broadcasted_by != request.user and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '자신의 방송 이력만 조회할 수 있습니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 시리얼라이저로 기본 정보 반환 (오디오 base64 제외)
            serializer = BroadcastHistorySerializer(history_item)
            response_data = serializer.data
            
            # 항상 방송서버에서 오디오 가져오기
            logger.info(f"방송 이력 {history_id}에서 방송서버로 오디오 가져오기 시도")
            
            try:
                # 방송 이력에 프리뷰가 있는지 확인
                if history_item.preview and history_item.preview.preview_id:
                    # 프리뷰 ID로 방송서버에서 오디오 가져오기
                    # 방송서버 URL: http://10.129.55.251:10200/api/broadcast/preview/audio/{preview_id}
                    external_api_url = f"http://10.129.55.251:10200/api/broadcast/preview/audio/{history_item.preview.preview_id}"
                    logger.info(f"프리뷰 ID {history_item.preview.preview_id}로 방송서버 요청: {external_api_url}")
                else:
                    logger.warning(f"방송 이력 {history_id}에 프리뷰가 없음")
                    response_data['audio_base64'] = None
                    return Response({
                        'success': True,
                        'history': response_data,
                        'timestamp': timezone.now().isoformat()
                    })
                
                import requests
                audio_response = requests.get(external_api_url, timeout=30)
                logger.info(f"방송서버 오디오 응답 상태: {audio_response.status_code}")
                
                if audio_response.status_code == 200:
                    # 오디오 파일을 base64로 인코딩
                    import base64
                    audio_base64 = base64.b64encode(audio_response.content).decode('utf-8')
                    response_data['audio_base64'] = audio_base64
                    logger.info(f"방송서버에서 오디오 base64 인코딩 완료: {len(audio_base64)} characters")
                else:
                    logger.warning(f"방송서버에서 오디오 파일을 가져올 수 없음: {audio_response.status_code}")
                    response_data['audio_base64'] = None
            except Exception as e:
                logger.error(f"방송서버에서 오디오 가져오기 실패: {e}")
                response_data['audio_base64'] = None
            
            return Response({
                'success': True,
                'history': response_data,
                'timestamp': timezone.now().isoformat()
            })
            
        except BroadcastHistory.DoesNotExist:
            return Response({
                'success': False,
                'message': '해당 방송 이력을 찾을 수 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"방송 이력 상세 조회 실패: {e}")
            return Response({
                'success': False,
                'message': '방송 이력을 조회할 수 없습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ReuseHistoryAudioView(APIView):
    """방송 이력에서 오디오 파일 재사용 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def post(self, request, history_id):
        """방송 이력의 오디오 파일을 재사용하여 새로운 프리뷰 생성"""
        try:
            # 방송 이력 조회
            history_item = get_object_or_404(BroadcastHistory, id=history_id)
            
            # 권한 확인 - 자신의 이력만 재사용 가능
            if history_item.broadcasted_by != request.user and not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '자신의 방송 이력만 재사용할 수 있습니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 프리뷰가 있는지 확인
            if not history_item.preview or not history_item.preview.preview_id:
                return Response({
                    'success': False,
                    'message': '해당 방송 이력에 재사용 가능한 프리뷰가 없습니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 방송서버에서 프리뷰 오디오 가져오기
            external_api_url = f"http://10.129.55.251:10200/api/broadcast/preview/audio/{history_item.preview.preview_id}"
            
            try:
                audio_response = requests.get(external_api_url, timeout=30)
                
                if audio_response.status_code != 200:
                    return Response({
                        'success': False,
                        'message': '방송서버에서 오디오 파일을 가져올 수 없습니다.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                # 방송서버 URL
                broadcast_server_url = "http://10.129.55.251:10200/api/broadcast/audio"
                
                # 오디오 파일을 방송서버로 전송하여 새로운 프리뷰 생성
                files = {'audio_file': (f"reused_{history_item.preview.preview_id}.mp3", audio_response.content, 'audio/mpeg')}
                
                # 일반 오디오 방송과 동일하게 파라미터 구성
                broadcast_data = {
                    'auto_off': str(history_item.auto_off).lower()
                }

                # target_rooms를 안전하게 배열로 변환
                target_rooms = parse_target_rooms_from_formdata(history_item.target_rooms)
                if target_rooms:
                    broadcast_data['target_rooms'] = ','.join(map(str, target_rooms))

                # 방송서버에 요청
                broadcast_response = requests.post(broadcast_server_url, data=broadcast_data, files=files, timeout=30)
                
                if broadcast_response.status_code != 200:
                    return Response({
                        'success': False,
                        'message': '방송서버에서 프리뷰 생성에 실패했습니다.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                # 방송서버 응답 파싱
                broadcast_data = broadcast_response.json()
                
                if not broadcast_data.get('success'):
                    return Response({
                        'success': False,
                        'message': broadcast_data.get('message', '방송서버에서 프리뷰 생성에 실패했습니다.')
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                # 새로운 프리뷰 정보 추출
                preview_info = broadcast_data.get('preview_info', {})
                preview_id = preview_info.get('preview_id')
                
                if not preview_id:
                    return Response({
                        'success': False,
                        'message': '방송서버에서 프리뷰 ID를 받지 못했습니다.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                # 새로운 프리뷰 생성
                new_preview = BroadcastPreview.objects.create(
                    preview_id=preview_id,
                    broadcast_type=history_item.broadcast_type,
                    content=f"[재사용] {history_item.content}",
                    target_rooms=target_rooms,
                    language=history_item.language,
                    auto_off=history_item.auto_off,
                    status='pending',
                    created_by=request.user,
                    approved_by=None,
                    created_at=timezone.now(),
                    approved_at=None,
                    expires_at=timezone.now() + timedelta(hours=1)
                )
                
                logger.info(f"방송 이력 재사용 성공: {history_id} -> 새로운 프리뷰 {preview_id}")
                
                return Response({
                    'success': True,
                    'status': 'preview_ready',  # 새로운 오디오 방송과 동일한 status
                    'message': '방송 이력에서 오디오 파일을 재사용하여 새로운 프리뷰가 생성되었습니다.',
                    'preview_info': {
                        'preview_id': new_preview.preview_id,
                        'broadcast_type': new_preview.broadcast_type,
                        'content': new_preview.content,
                        'created_at': new_preview.created_at.isoformat()
                    },
                    'timestamp': timezone.now().isoformat()
                })
                
            except requests.exceptions.RequestException as e:
                logger.error(f"방송서버 요청 실패: {e}")
                return Response({
                    'success': False,
                    'message': '방송서버 연결에 실패했습니다.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except BroadcastHistory.DoesNotExist:
            return Response({
                'success': False,
                'message': '해당 방송 이력을 찾을 수 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"오디오 파일 재사용 실패: {e}")
            return Response({
                'success': False,
                'message': '오디오 파일 재사용에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminBroadcastHistoryView(APIView):
    """어드민 전용 방송 이력 전체 조회 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def get(self, request):
        """어드민용 전체 방송 이력 조회"""
        try:
            # 어드민 권한 확인
            if not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '어드민 권한이 필요합니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            limit = int(request.GET.get('limit', 100))
            
            # 전체 방송 이력 조회
            histories = BroadcastHistory.objects.all().order_by('-created_at')[:limit]
            serializer = BroadcastHistorySerializer(histories, many=True)
            
            return Response({
                'success': True,
                'history': serializer.data,
                'total_count': len(serializer.data),
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"어드민 방송 이력 조회 실패: {e}")
            return Response({
                'success': False,
                'message': '방송 이력을 조회할 수 없습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AudioFileView(APIView):
    """오디오 파일 관리 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """오디오 파일 목록 조회"""
        try:
            files = AudioFile.objects.filter(is_active=True).order_by('-created_at')
            serializer = AudioFileSerializer(files, many=True, context={'request': request})
            
            return Response({
                'success': True,
                'message': '오디오 파일 목록을 성공적으로 조회했습니다.',
                'files': serializer.data
            })
            
        except Exception as e:
            logger.error(f"오디오 파일 목록 조회 실패: {e}")
            return Response({
                'success': False,
                'message': '오디오 파일 목록 조회에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """오디오 파일 업로드"""
        try:
            audio_file = request.FILES.get('audio_file')
            if not audio_file:
                return Response({
                    'success': False,
                    'message': '오디오 파일이 필요합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 파일 크기 검증
            max_size = settings.BROADCAST_CONFIG['MAX_AUDIO_SIZE'] * 1024 * 1024
            if audio_file.size > max_size:
                return Response({
                    'success': False,
                    'message': f'파일 크기가 너무 큽니다. 최대 {settings.BROADCAST_CONFIG["MAX_AUDIO_SIZE"]}MB까지 허용됩니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 오디오 파일 생성
            audio_file_obj = AudioFile.objects.create(
                file=audio_file,
                original_filename=audio_file.name,
                file_size=audio_file.size,
                uploaded_by=request.user
            )
            
            serializer = AudioFileSerializer(audio_file_obj, context={'request': request})
            
            return Response({
                'success': True,
                'message': '오디오 파일이 성공적으로 업로드되었습니다.',
                'file': serializer.data
            })
            
        except Exception as e:
            logger.error(f"오디오 파일 업로드 실패: {e}")
            return Response({
                'success': False,
                'message': '오디오 파일 업로드에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsTeacherUser])  # 중앙화된 권한 관리 사용
def broadcast_status(request):
    """방송 시스템 상태 확인"""
    try:
        service = BroadcastService()
        
        # 장치 수 조회 - "장치"로 시작하는 기기들 제외
        total_devices = DeviceMatrix.objects.filter(
            is_active=True
        ).exclude(
            device_name__startswith='장치'
        ).count()
        
        # 최근 방송 이력 수 조회
        recent_broadcasts = BroadcastHistory.objects.count()
        
        # 오디오 파일 수 조회
        total_audio_files = AudioFile.objects.filter(is_active=True).count()
        
        return Response({
            'success': True,
            'message': '방송 시스템 상태를 성공적으로 조회했습니다.',
            'status': {
                'total_devices': total_devices,
                'recent_broadcasts': recent_broadcasts,
                'total_audio_files': total_audio_files,
                'system_healthy': True
            }
        })
        
    except Exception as e:
        logger.error(f"방송 시스템 상태 조회 실패: {e}")
        return Response({
            'success': False,
            'message': '방송 시스템 상태 조회에 실패했습니다.',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AudioPreviewView(APIView):
    """오디오 프리뷰 뷰 - 외부 API에서 받은 프리뷰 정보를 처리하고 오디오 파일 업로드"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request):
        """외부 API에서 받은 프리뷰 정보를 처리하거나 오디오 파일을 업로드하여 프리뷰 생성"""
        try:
            # 외부 API에서 전달받은 프리뷰 정보가 있는지 확인
            preview_data = request.data.get('preview_info', {})
            
            if preview_data:
                # 외부 API에서 받은 프리뷰 정보 처리
                if not preview_data.get('preview_id'):
                    return Response({
                        'success': False,
                        'message': '프리뷰 ID가 필요합니다.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # target_rooms를 안전하게 배열로 변환
                target_rooms = parse_target_rooms_from_formdata(request.data.get('target_rooms', []))
                
                # 프리뷰 생성
                preview = BroadcastPreview.objects.create(
                    preview_id=preview_data['preview_id'],
                    broadcast_type='audio',
                    content=f"오디오 프리뷰: {preview_data.get('preview_id', 'Unknown')}",
                    target_rooms=target_rooms,
                    language=request.data.get('language', 'ko'),
                    auto_off=request.data.get('auto_off', False),
                    status='ready',
                    created_by=request.user
                )
                
                # 프리뷰 정보 구성 (필요한 정보만)
                preview_info = {
                    'preview_id': preview_data['preview_id'],
                    'job_type': 'audio',
                    'preview_url': f"/api/broadcast/preview/{preview_data['preview_id']}",
                    'estimated_duration': preview_data['estimated_duration'],
                    'created_at': preview.created_at.isoformat(),
                    'status': preview_data.get('status', 'pending')
                }
                
                return Response({
                    'success': True,
                    'status': 'preview_ready',
                    'preview_info': preview_info,
                    'message': '오디오 방송 프리뷰가 생성되었습니다. 확인 후 승인해주세요.',
                    'timestamp': timezone.now().isoformat()
                })
            else:
                # 오디오 파일 업로드 처리
                audio_file = request.FILES.get('audio_file')
                if not audio_file:
                    return Response({
                        'success': False,
                        'message': '오디오 파일이 필요합니다.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # 파일 크기 검증
                max_size = settings.BROADCAST_CONFIG['MAX_AUDIO_SIZE'] * 1024 * 1024
                if audio_file.size > max_size:
                    return Response({
                        'success': False,
                        'message': f'파일 크기가 너무 큽니다. 최대 {settings.BROADCAST_CONFIG["MAX_AUDIO_SIZE"]}MB까지 허용됩니다.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # 오디오 파일 생성
                audio_file_obj = AudioFile.objects.create(
                    file=audio_file,
                    original_filename=audio_file.name,
                    file_size=audio_file.size,
                    uploaded_by=request.user
                )
                
                # 프리뷰 생성
                preview = BroadcastPreview.objects.create(
                    broadcast_type='audio',
                    content=f"오디오 프리뷰: {audio_file.name}",
                    target_rooms=request.data.get('target_rooms', []),
                    language=request.data.get('language', 'ko'),
                    auto_off=request.data.get('auto_off', False),
                    status='ready',
                    audio_file=audio_file_obj,  # 오디오 파일 연결
                    created_by=request.user
                )
                
                # 프리뷰 정보 구성
                preview_info = {
                    'preview_id': preview.preview_id,
                    'job_type': 'audio',
                    'preview_url': f"/api/broadcast/preview/{preview.preview_id}",
                    'estimated_duration': 0,  # 실제 오디오 길이 계산 필요
                    'created_at': preview.created_at.isoformat(),
                    'status': preview.status
                }
                
                return Response({
                    'success': True,
                    'status': 'preview_ready',
                    'preview_info': preview_info,
                    'message': '오디오 방송 프리뷰가 생성되었습니다. 확인 후 승인해주세요.',
                    'timestamp': timezone.now().isoformat()
                })
            
        except Exception as e:
            logger.error(f"오디오 프리뷰 생성 실패: {e}")
            return Response({
                'success': False,
                'message': '오디오 프리뷰 생성에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PreviewApprovalView(APIView):
    """프리뷰 승인/거부 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def post(self, request, preview_id):
        """프리뷰 승인 또는 거부"""
        try:
            preview = get_object_or_404(BroadcastPreview, preview_id=preview_id)
            
            # 사용자가 자신이 생성한 프리뷰만 접근할 수 있도록 권한 확인
            if preview.created_by != request.user:
                return Response({
                    'success': False,
                    'message': '자신이 생성한 프리뷰만 처리할 수 있습니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 만료된 프리뷰인지 확인
            if preview.is_expired():
                preview.status = 'expired'
                preview.save()
                return Response({
                    'success': False,
                    'message': '프리뷰가 만료되었습니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 이미 처리된 프리뷰인지 확인
            if preview.status in ['approved', 'rejected']:
                return Response({
                    'success': False,
                    'message': '이미 처리된 프리뷰입니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = PreviewApprovalSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'message': '입력 데이터가 유효하지 않습니다.',
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            action = serializer.validated_data['action']
            
            if action == 'approve':
                # 프리뷰 승인 - 외부 API에 승인 요청
                try:
                    # 외부 API에 프리뷰 승인 요청
                    external_api_url = f"{settings.BROADCAST_API_CONFIG['BASE_URL']}/api/broadcast/preview/approve/{preview_id}"
                    
                    import requests
                    approval_response = requests.post(external_api_url, timeout=30)
                    logger.info(f"외부 API 승인 요청 상태: {approval_response.status_code}")
                    
                    if approval_response.status_code == 200:
                        approval_data = approval_response.json()
                        logger.info(f"외부 API 승인 응답: {approval_data}")
                        
                        # 프리뷰 상태 업데이트
                        preview.status = 'approved'
                        preview.approved_by = request.user
                        preview.approved_at = timezone.now()
                        preview.save()
                        
                        # 방송 이력 생성
                        broadcast_history = BroadcastHistory.objects.create(
                            broadcast_type=preview.broadcast_type,
                            content=preview.content,
                            target_rooms=preview.target_rooms,
                            language=preview.language,
                            auto_off=preview.auto_off,
                            status='completed',
                            broadcasted_by=preview.created_by,  # 프리뷰 생성자가 방송자
                            completed_at=timezone.now(),
                            preview=preview  # 프리뷰 연결
                        )
                        logger.info(f"방송 이력 생성됨: {broadcast_history.id} - {broadcast_history.content[:30]}...")
                        
                        return Response({
                            'success': True,
                            'preview_id': preview.preview_id,
                            'broadcast_result': approval_data.get('broadcast_result', {
                                'status': 'queued',
                                'queue_size': 1,
                                'queue_position': 1,
                                'estimated_start_time': timezone.now().strftime('%H:%M:%S'),
                                'estimated_duration': 0,
                                'message': '방송이 대기열에 추가되었습니다.'
                            }),
                            'message': '프리뷰가 승인되어 방송 큐에 추가되었습니다.',
                            'timestamp': timezone.now().isoformat()
                        })
                    else:
                        logger.error(f"외부 API 승인 요청 실패: {approval_response.status_code}")
                        logger.error(f"외부 API 응답 내용: {approval_response.text}")
                        return Response({
                            'success': False,
                            'message': '외부 API에서 프리뷰 승인에 실패했습니다.',
                            'error': f'외부 API 오류: {approval_response.status_code}',
                            'external_response': approval_response.text
                        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                except requests.exceptions.RequestException as e:
                    logger.error(f"외부 API 승인 요청 실패: {e}")
                    return Response({
                        'success': False,
                        'message': '외부 API에 연결할 수 없습니다.',
                        'error': str(e)
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                except Exception as e:
                    logger.error(f"프리뷰 승인 후 방송 실행 실패: {e}")
                    return Response({
                        'success': False,
                        'message': '프리뷰 승인 후 방송 실행에 실패했습니다.',
                        'error': str(e)
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            elif action == 'reject':
                # 프리뷰 거부
                preview.status = 'rejected'
                preview.rejection_reason = serializer.validated_data.get('rejection_reason', '')
                preview.save()
                
                # 거부된 방송 이력 생성
                broadcast_history = BroadcastHistory.objects.create(
                    broadcast_type=preview.broadcast_type,
                    content=preview.content,
                    target_rooms=preview.target_rooms,
                    language=preview.language,
                    auto_off=preview.auto_off,
                    status='failed',
                    error_message=f"프리뷰 거부됨: {preview.rejection_reason}",
                    broadcasted_by=preview.created_by,  # 프리뷰 생성자가 방송자
                    completed_at=timezone.now(),
                    preview=preview  # 프리뷰 연결
                )
                logger.info(f"거부된 방송 이력 생성됨: {broadcast_history.id} - {broadcast_history.content[:30]}...")
                
                return Response({
                    'success': True,
                    'preview_id': preview.preview_id,
                    'message': '프리뷰가 거부되었습니다.',
                    'timestamp': timezone.now().isoformat()
                })
            
        except Exception as e:
            logger.error(f"프리뷰 승인/거부 실패: {e}")
            return Response({
                'success': False,
                'message': '프리뷰 승인/거부에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsTeacherUser])  # 중앙화된 권한 관리 사용
def preview_audio_file(request, preview_id):
    """프리뷰 오디오 파일 다운로드 - 외부 API에서 파일을 받아서 그대로 응답"""
    try:
        preview = get_object_or_404(BroadcastPreview, preview_id=preview_id)
        
        # 사용자가 자신이 생성한 프리뷰의 오디오 파일만 다운로드할 수 있도록 권한 확인
        if preview.created_by != request.user and not request.user.is_superuser:
            return Response({
                'success': False,
                'message': '자신이 생성한 프리뷰의 오디오 파일만 다운로드할 수 있습니다.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 만료된 프리뷰인지 확인
        if preview.is_expired():
            return Response({
                'success': False,
                'message': '프리뷰가 만료되었습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 프리뷰에 연결된 오디오 파일이 있는지 확인
        if preview.audio_file and preview.audio_file.file:
            # 이미 저장된 내부 오디오 파일 제공
            from django.http import HttpResponse
            import mimetypes
            
            # 파일 타입 확인
            content_type, _ = mimetypes.guess_type(preview.audio_file.original_filename)
            if not content_type:
                content_type = 'audio/mpeg'
            
            # 파일 응답 생성
            response = HttpResponse(preview.audio_file.file, content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{preview.audio_file.original_filename}"'
            # CORS 헤더 추가
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
            return response
        else:
            # 방송서버에서 프리뷰 오디오 파일을 가져와서 그대로 응답
            # 방송서버 URL: http://10.129.55.251:10200/api/broadcast/preview/audio/{preview_id}.mp3
            external_api_url = f"http://10.129.55.251:10200/api/broadcast/preview/audio/{preview_id}"
            
            try:
                # 방송서버에 요청해서 파일을 가져오기
                import requests
                response = requests.get(external_api_url, stream=True, timeout=30)
                logger.info(f"방송서버 응답 상태: {response.status_code}")
                logger.info(f"방송서버 응답 헤더: {dict(response.headers)}")
                
                if response.status_code == 200:
                    # 응답 내용 확인
                    content = response.content
                    logger.info(f"방송서버 응답 크기: {len(content)} bytes")
                    
                    # Content-Type이 application/json인 경우에만 JSON 응답으로 처리
                    content_type = response.headers.get('content-type', '')
                    if 'application/json' in content_type:
                        try:
                            import json
                            json_content = json.loads(content)
                            logger.error(f"방송서버가 JSON 응답을 반환함: {json_content}")
                            return Response({
                                'success': False,
                                'message': '방송서버에서 오디오 파일 대신 JSON 응답을 반환했습니다.',
                                'external_response': json_content
                            }, status=status.HTTP_400_BAD_REQUEST)
                        except json.JSONDecodeError:
                            pass
                    
                    # 방송서버에서 파일을 성공적으로 가져온 경우 - 그대로 응답
                    from django.http import HttpResponse
                    http_response = HttpResponse(content, content_type='audio/mpeg')
                    http_response['Content-Disposition'] = f'inline; filename="{preview_id}"'
                    # CORS 헤더 추가
                    http_response['Access-Control-Allow-Origin'] = '*'
                    http_response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                    http_response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
                    logger.info(f"방송서버 오디오 파일 응답 완료: {len(content)} bytes")
                    return http_response
                else:
                    # 방송서버에서 파일을 찾을 수 없는 경우
                    logger.error(f"방송서버에서 파일을 찾을 수 없음: {response.status_code}")
                    logger.error(f"방송서버 응답 내용: {response.text}")
                    return Response({
                        'success': False,
                        'message': f'방송서버에서 프리뷰 오디오 파일을 찾을 수 없습니다. (상태 코드: {response.status_code})',
                        'external_url': external_api_url,
                        'response_text': response.text
                    }, status=status.HTTP_404_NOT_FOUND)
                    
            except requests.exceptions.RequestException as e:
                # 방송서버 연결 실패
                logger.error(f"방송서버 연결 실패: {e}")
                return Response({
                    'success': False,
                    'message': '방송서버에 연결할 수 없습니다.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Http404:
        return Response({
            'success': False,
            'message': '프리뷰를 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"프리뷰 오디오 파일 다운로드 실패: {e}")
        return Response({
            'success': False,
            'message': '오디오 파일 다운로드에 실패했습니다.',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PreviewListView(APIView):
    """프리뷰 목록 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def get(self, request):
        """프리뷰 목록 조회"""
        try:
            # 만료된 프리뷰들 자동으로 만료 상태로 변경
            expired_previews = BroadcastPreview.objects.filter(
                status__in=['pending', 'ready'],
                expires_at__lt=timezone.now()
            )
            expired_previews.update(status='expired')
            
            # 프리뷰 목록 조회 - 모든 사용자는 자신이 생성한 프리뷰만 조회
            previews = BroadcastPreview.objects.filter(
                status__in=['pending', 'ready'],
                created_by=request.user  # 사용자가 생성한 프리뷰만 필터링
            ).order_by('-created_at')
            
            preview_list = []
            for preview in previews:
                preview_list.append({
                    'preview_id': preview.preview_id,
                    'job_type': preview.broadcast_type,
                    'estimated_duration': 0,  # 외부 API에서 제공하는 값 사용
                    'created_at': preview.created_at.isoformat(),
                    'status': preview.status
                })
            
            return Response({
                'success': True,
                'previews': preview_list,
                'count': len(preview_list),
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"프리뷰 목록 조회 실패: {e}")
            return Response({
                'success': False,
                'message': '프리뷰 목록 조회에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminPreviewListView(APIView):
    """어드민 전용 프리뷰 전체 조회 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def get(self, request):
        """어드민용 전체 프리뷰 조회"""
        try:
            # 어드민 권한 확인
            if not request.user.is_superuser:
                return Response({
                    'success': False,
                    'message': '어드민 권한이 필요합니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 만료된 프리뷰들 자동으로 만료 상태로 변경
            expired_previews = BroadcastPreview.objects.filter(
                status__in=['pending', 'ready'],
                expires_at__lt=timezone.now()
            )
            expired_previews.update(status='expired')
            
            # 전체 프리뷰 목록 조회 (어드민은 모든 프리뷰 조회 가능)
            previews = BroadcastPreview.objects.all().order_by('-created_at')
            
            preview_list = []
            for preview in previews:
                preview_list.append({
                    'preview_id': preview.preview_id,
                    'job_type': preview.broadcast_type,
                    'estimated_duration': 0,  # 외부 API에서 제공하는 값 사용
                    'created_at': preview.created_at.isoformat(),
                    'status': preview.status,
                    'created_by_username': preview.created_by.username if preview.created_by else 'Unknown'
                })
            
            return Response({
                'success': True,
                'previews': preview_list,
                'count': len(preview_list),
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"어드민 프리뷰 목록 조회 실패: {e}")
            return Response({
                'success': False,
                'message': '프리뷰 목록 조회에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TextPreviewView(APIView):
    """텍스트 프리뷰 뷰 - 외부 API에서 생성된 프리뷰 정보를 받아서 처리"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def post(self, request):
        """외부 API에서 생성된 텍스트 프리뷰 정보를 받아서 저장"""
        try:
            # 외부 API에서 전달받은 프리뷰 정보
            preview_data = request.data.get('preview_info', {})
            
            if not preview_data:
                return Response({
                    'success': False,
                    'message': '프리뷰 정보가 필요합니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 필수 필드 검증
            required_fields = ['preview_id', 'job_type', 'preview_url', 'approval_endpoint', 'estimated_duration']
            for field in required_fields:
                if field not in preview_data:
                    return Response({
                        'success': False,
                        'message': f'필수 필드가 누락되었습니다: {field}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # 프리뷰 생성
            preview = BroadcastPreview.objects.create(
                preview_id=preview_data['preview_id'],
                broadcast_type='text',
                content=request.data.get('text', f"텍스트 프리뷰: {preview_data.get('preview_id', 'Unknown')}"),
                target_rooms=request.data.get('target_rooms', []),
                language=request.data.get('language', 'ko'),
                auto_off=request.data.get('auto_off', False),
                status='ready',
                created_by=request.user
            )
            
            # 프리뷰 정보 구성 (외부 API에서 받은 정보 그대로 전달)
            preview_info = {
                'preview_id': preview_data['preview_id'],
                'job_type': preview_data['job_type'],
                'preview_url': preview_data['preview_url'],
                'approval_endpoint': preview_data['approval_endpoint'],
                'estimated_duration': preview_data['estimated_duration'],
                'created_at': preview.created_at.isoformat(),
                'status': preview_data.get('status', 'pending')
            }
            
            # 추가 지시사항 포함
            instructions = {
                'preview_id': preview_data['preview_id'],
                'listen_preview': f"GET {preview_data['preview_url']}",
                'approve_preview': f"POST {preview_data['approval_endpoint']}",
                'reject_preview': f"POST /api/broadcast/reject/{preview_data['preview_id']}",
                'check_all_previews': "GET /api/broadcast/previews"
            }
            
            return Response({
                'success': True,
                'status': 'preview_ready',
                'preview_info': preview_info,
                'message': '텍스트 방송 프리뷰가 생성되었습니다. 확인 후 승인해주세요.',
                'instructions': instructions,
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"텍스트 프리뷰 생성 실패: {e}")
            return Response({
                'success': False,
                'message': '텍스트 프리뷰 생성에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PreviewRejectView(APIView):
    """프리뷰 거부 전용 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def post(self, request, preview_id):
        """프리뷰 거부"""
        try:
            preview = get_object_or_404(BroadcastPreview, preview_id=preview_id)
            
            # 사용자가 자신이 생성한 프리뷰만 접근할 수 있도록 권한 확인
            if preview.created_by != request.user:
                return Response({
                    'success': False,
                    'message': '자신이 생성한 프리뷰만 처리할 수 있습니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 만료된 프리뷰인지 확인
            if preview.is_expired():
                preview.status = 'expired'
                preview.save()
                return Response({
                    'success': False,
                    'message': '프리뷰가 만료되었습니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 이미 처리된 프리뷰인지 확인
            if preview.status in ['approved', 'rejected']:
                return Response({
                    'success': False,
                    'message': '이미 처리된 프리뷰입니다.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 거부 사유 가져오기
            rejection_reason = request.data.get('rejection_reason', '')
            
            # 프리뷰 거부
            preview.status = 'rejected'
            preview.rejection_reason = rejection_reason
            preview.save()
            
            # 거부된 방송 이력 생성
            broadcast_history = BroadcastHistory.objects.create(
                broadcast_type=preview.broadcast_type,
                content=preview.content,
                target_rooms=preview.target_rooms,
                language=preview.language,
                auto_off=preview.auto_off,
                status='failed',
                error_message=f"프리뷰 거부됨: {preview.rejection_reason}",
                broadcasted_by=preview.created_by,  # 프리뷰 생성자가 방송자
                completed_at=timezone.now(),
                preview=preview  # 프리뷰 연결
            )
            logger.info(f"거부된 방송 이력 생성됨: {broadcast_history.id} - {broadcast_history.content[:30]}...")
            
            return Response({
                'success': True,
                'preview_id': preview.preview_id,
                'message': '프리뷰가 거부되었습니다.',
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"프리뷰 거부 실패: {e}")
            return Response({
                'success': False,
                'message': '프리뷰 거부에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PreviewDetailView(APIView):
    """프리뷰 상세 정보 조회 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    def get(self, request, preview_id):
        """특정 프리뷰의 상세 정보 조회"""
        try:
            preview = get_object_or_404(BroadcastPreview, preview_id=preview_id)
            
            # 사용자가 자신이 생성한 프리뷰만 조회할 수 있도록 권한 확인
            if preview.created_by != request.user:
                return Response({
                    'success': False,
                    'message': '자신이 생성한 프리뷰만 조회할 수 있습니다.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # target_rooms를 안전하게 배열로 변환
            target_rooms = parse_target_rooms_from_formdata(preview.target_rooms)
            
            # 프리뷰 정보 구성 (필요한 정보만)
            preview_info = {
                'preview_id': preview.preview_id,
                'job_type': preview.broadcast_type,
                'params': {
                    'target_rooms': target_rooms,
                    'language': preview.language,
                    'auto_off': preview.auto_off
                },
                'preview_url': f"/api/broadcast/preview/{preview.preview_id}",
                'estimated_duration': 0,  # 외부 API에서 제공하는 값 사용
                'created_at': preview.created_at.isoformat(),
                'status': preview.status
            }
            
            # 방송서버에서 오디오 파일을 가져와서 base64로 인코딩
            audio_base64 = None
            try:
                audio_url = f"http://10.129.55.251:10200/api/broadcast/preview/audio/{preview.preview_id}"
                audio_response = requests.get(audio_url, timeout=30)
                if audio_response.status_code == 200:
                    audio_base64 = base64.b64encode(audio_response.content).decode('utf-8')
                    logger.info(f"프리뷰 상세 조회 - 오디오 파일 base64 인코딩 완료: {len(audio_base64)} characters")
                else:
                    logger.warning(f"프리뷰 상세 조회 - 방송서버에서 오디오 파일을 가져올 수 없음: {audio_response.status_code}")
            except Exception as e:
                logger.error(f"프리뷰 상세 조회 - 오디오 파일 base64 인코딩 실패: {e}")
            
            preview_info['audio_base64'] = audio_base64
            
            return Response({
                'success': True,
                'preview_info': preview_info,
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"프리뷰 정보 조회 실패: {e}")
            return Response({
                'success': False,
                'message': '프리뷰 정보 조회에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TestExternalPreviewView(APIView):
    """외부 API 프리뷰 응답을 시뮬레이션하는 테스트 뷰"""
    # permission_classes 제거 - 기본 권한 클래스 사용
    
    
    def post(self, request):
        """외부 API에서 전달받은 프리뷰 정보를 시뮬레이션"""
        try:
            # 시뮬레이션된 외부 API 응답
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            preview_id = f"preview_{timestamp}_{unique_id}"
            
            # 외부 API 응답 형태로 데이터 구성 (필요한 정보만)
            external_response = {
                "success": True,
                "status": "preview_ready",
                "preview_info": {
                    "preview_id": preview_id,
                    "job_type": request.data.get('broadcast_type', 'text'),
                    "preview_url": f"/api/broadcast/preview/{preview_id}",
                    "estimated_duration": 8.5,
                    "created_at": timezone.now().isoformat(),
                    "status": "pending"
                },
                "message": f"{request.data.get('broadcast_type', 'text')} 방송 프리뷰가 생성되었습니다. 확인 후 승인해주세요.",
                "timestamp": timezone.now().isoformat()
            }
            
            # 프리뷰 정보를 Django 모델에 저장
            preview = BroadcastPreview.objects.create(
                preview_id=preview_id,
                broadcast_type=request.data.get('broadcast_type', 'text'),
                content=request.data.get('content', f"테스트 프리뷰: {preview_id}"),
                target_rooms=request.data.get('target_rooms', []),
                language=request.data.get('language', 'ko'),
                auto_off=request.data.get('auto_off', False),
                status='ready',
                created_by=request.user
            )
            
            return Response(external_response)
            
        except Exception as e:
            logger.error(f"외부 프리뷰 시뮬레이션 실패: {e}")
            return Response({
                'success': False,
                'message': '외부 프리뷰 시뮬레이션에 실패했습니다.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsTeacherUser])  # 중앙화된 권한 관리 사용
def download_audio_file(request, file_id):
    """오디오 파일 다운로드"""
    try:
        audio_file = get_object_or_404(AudioFile, id=file_id, is_active=True)
        
        if audio_file.file and audio_file.file.storage.exists(audio_file.file.name):
            from django.http import HttpResponse
            import mimetypes
            
            # 파일 타입 확인
            content_type, _ = mimetypes.guess_type(audio_file.original_filename)
            if not content_type:
                content_type = 'audio/mpeg'
            
            # 파일 응답 생성
            response = HttpResponse(audio_file.file, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{audio_file.original_filename}"'
            return response
        else:
            return Response({
                'success': False,
                'message': '파일을 찾을 수 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except Http404:
        return Response({
            'success': False,
            'message': '오디오 파일을 찾을 수 없습니다.'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"오디오 파일 다운로드 실패: {e}")
        return Response({
            'success': False,
            'message': '오디오 파일 다운로드에 실패했습니다.',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsTeacherUser])  # 중앙화된 권한 관리 사용
def download_history_audio(request, history_id):
    """방송 이력의 오디오 파일 다운로드"""
    try:
        history_item = get_object_or_404(BroadcastHistory, id=history_id)
        
        # 사용자가 자신의 방송 이력만 다운로드할 수 있도록 권한 확인
        if history_item.broadcasted_by != request.user and not request.user.is_staff:
            return Response({
                'success': False,
                'message': '자신의 방송 이력만 다운로드할 수 있습니다.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 프리뷰가 있는지 확인
        if not history_item.preview or not history_item.preview.preview_id:
            return Response({
                'success': False,
                'message': '이 방송 이력에는 오디오 파일이 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 방송서버에서 오디오 파일 가져오기
        external_api_url = f"http://10.129.55.251:10200/api/broadcast/preview/audio/{history_item.preview.preview_id}"
        
        try:
            # 방송서버에 요청해서 파일을 가져오기
            import requests
            response = requests.get(external_api_url, timeout=30)
            logger.info(f"방송서버 응답 상태: {response.status_code}")
            logger.info(f"방송서버 응답 헤더: {dict(response.headers)}")
            
            if response.status_code == 200:
                # 응답 내용 확인
                content = response.content
                logger.info(f"방송서버 응답 크기: {len(content)} bytes")
                
                # Content-Type이 application/json인 경우에만 JSON 응답으로 처리
                content_type = response.headers.get('content-type', '')
                if 'application/json' in content_type:
                    try:
                        import json
                        json_content = json.loads(content)
                        logger.error(f"방송서버가 JSON 응답을 반환함: {json_content}")
                        return Response({
                            'success': False,
                            'message': '방송서버에서 오디오 파일 대신 JSON 응답을 반환했습니다.',
                            'external_response': json_content
                        }, status=status.HTTP_400_BAD_REQUEST)
                    except json.JSONDecodeError:
                        pass
                
                # 방송서버에서 파일을 성공적으로 가져온 경우 - 그대로 응답
                from django.http import HttpResponse
                http_response = HttpResponse(content, content_type='audio/mpeg')
                http_response['Content-Disposition'] = f'inline; filename="{history_item.preview.preview_id}"'
                # CORS 헤더 추가
                http_response['Access-Control-Allow-Origin'] = '*'
                http_response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                http_response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
                logger.info(f"방송서버 오디오 파일 응답 완료: {len(content)} bytes")
                return http_response
            else:
                # 방송서버에서 파일을 찾을 수 없는 경우
                logger.error(f"방송서버에서 파일을 찾을 수 없음: {response.status_code}")
                logger.error(f"방송서버 응답 내용: {response.text}")
                return Response({
                    'success': False,
                    'message': f'방송서버에서 프리뷰 오디오 파일을 찾을 수 없습니다. (상태 코드: {response.status_code})',
                    'external_url': external_api_url,
                    'response_text': response.text
                }, status=status.HTTP_404_NOT_FOUND)
                
        except requests.exceptions.RequestException as e:
            # 방송서버 연결 실패
            logger.error(f"방송서버 연결 실패: {e}")
            return Response({
                'success': False,
                'message': '방송서버에 연결할 수 없습니다.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Exception as e:
        logger.error(f"방송 이력 오디오 파일 다운로드 실패: {e}")
        return Response({
            'success': False,
            'message': '오디오 파일을 다운로드할 수 없습니다.',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
