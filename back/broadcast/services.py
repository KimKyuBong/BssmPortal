import requests
import json
import logging
from typing import List, Dict, Optional, Union
from django.conf import settings
from django.core.files import File
from django.utils import timezone
from .models import DeviceMatrix, BroadcastHistory, AudioFile

logger = logging.getLogger(__name__)

class BroadcastAPIService:
    """FastAPI 방송 서비스와 연동하는 클래스"""
    
    def __init__(self):
        self.base_url = settings.BROADCAST_API_CONFIG['BASE_URL']
        self.timeout = settings.BROADCAST_API_CONFIG['TIMEOUT']
        self.retry_attempts = settings.BROADCAST_API_CONFIG['RETRY_ATTEMPTS']
        self.api_key = settings.BROADCAST_API_CONFIG['API_KEY']
        
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({'Authorization': f'Bearer {self.api_key}'})
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """API 요청을 수행하는 내부 메서드"""
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(self.retry_attempts):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    timeout=self.timeout,
                    **kwargs
                )
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                logger.error(f"API 요청 실패 (시도 {attempt + 1}/{self.retry_attempts}): {e}")
                if attempt == self.retry_attempts - 1:
                    raise
                continue
    
    def get_device_matrix(self) -> Dict:
        """장치 매트릭스 조회"""
        try:
            response = self._make_request('GET', '/api/device-matrix/')
            return response
        except Exception as e:
            logger.error(f"장치 매트릭스 조회 실패: {e}")
            raise
    
    def sync_device_matrix(self) -> bool:
        """FastAPI에서 장치 매트릭스를 가져와서 Django DB에 동기화"""
        try:
            api_response = self.get_device_matrix()
            
            if not api_response.get('success'):
                logger.error("API 응답에서 success가 False입니다.")
                return False
            
            matrix_data = api_response.get('matrix', [])
            
            # 기존 데이터 삭제
            DeviceMatrix.objects.all().delete()
            
            # 새 데이터 생성
            devices_created = 0
            for row_idx, row in enumerate(matrix_data):
                for col_idx, device in enumerate(row):
                    DeviceMatrix.objects.create(
                        device_name=device['device_name'],
                        room_id=device['room_id'],
                        position_row=device['position']['row'],
                        position_col=device['position']['col'],
                        matrix_row=device['matrix_position']['row'],
                        matrix_col=device['matrix_position']['col']
                    )
                    devices_created += 1
            
            logger.info(f"장치 매트릭스 동기화 완료: {devices_created}개 장치")
            return True
            
        except Exception as e:
            logger.error(f"장치 매트릭스 동기화 실패: {e}")
            return False
    
    def broadcast_text(self, text: str, target_rooms: Optional[List[str]] = None, 
                      language: str = 'ko', auto_off: bool = False) -> Dict:
        """텍스트 방송 실행"""
        try:
            data = {
                'text': text,
                'language': language,
                'auto_off': auto_off
            }
            
            if target_rooms:
                data['target_rooms'] = ','.join(target_rooms)
            
            response = self._make_request('POST', '/api/broadcast/text', data=data)
            return response
        except Exception as e:
            logger.error(f"텍스트 방송 실패: {e}")
            raise
    
    def broadcast_audio(self, audio_file: File, target_rooms: Optional[List[str]] = None, 
                       auto_off: bool = False) -> Dict:
        """오디오 방송 실행"""
        try:
            # FastAPI와 동일한 형식으로 파일 전송
            # 파일명을 명시적으로 지정하여 FastAPI에서 정확히 인식하도록 함
            files = {'audio_file': (audio_file.name, audio_file, 'audio/mpeg')}
            data = {'auto_off': str(auto_off).lower()}
            
            if target_rooms:
                data['target_rooms'] = ','.join(target_rooms)
            
            logger.info(f"FastAPI로 오디오 파일 전송: {audio_file.name}, 대상방: {target_rooms}")
            
            response = self._make_request('POST', '/api/broadcast/audio', 
                                        files=files, data=data)
            return response
        except Exception as e:
            logger.error(f"오디오 방송 실패: {e}")
            raise

class BroadcastService:
    """방송 서비스 메인 클래스"""
    
    def __init__(self):
        self.api_service = BroadcastAPIService()
    
    def get_all_devices(self) -> List[DeviceMatrix]:
        """모든 장치 조회"""
        return DeviceMatrix.objects.filter(is_active=True).order_by('matrix_row', 'matrix_col')
    
    def get_devices_by_rooms(self, room_ids: List[int]) -> List[DeviceMatrix]:
        """특정 방들의 장치 조회"""
        return DeviceMatrix.objects.filter(
            room_id__in=room_ids, 
            is_active=True
        ).order_by('matrix_row', 'matrix_col')
    
    def execute_text_broadcast(self, text: str, target_rooms: Optional[List[str]] = None,
                              language: str = 'ko', auto_off: bool = False, 
                              user=None) -> BroadcastHistory:
        """텍스트 방송 실행 및 이력 저장"""
        # 방송 이력 생성
        broadcast_history = BroadcastHistory.objects.create(
            broadcast_type='text',
            content=text,
            target_rooms=target_rooms or [],
            language=language,
            auto_off=auto_off,
            status='pending',
            broadcasted_by=user
        )
        
        try:
            # API 호출
            api_response = self.api_service.broadcast_text(
                text=text,
                target_rooms=target_rooms,
                language=language,
                auto_off=auto_off
            )
            
            # 성공 시 상태 업데이트
            broadcast_history.status = 'completed'
            broadcast_history.completed_at = timezone.now()
            broadcast_history.save()
            
            logger.info(f"텍스트 방송 완료: {text[:50]}...")
            
        except Exception as e:
            # 실패 시 상태 업데이트
            broadcast_history.status = 'failed'
            broadcast_history.error_message = str(e)
            broadcast_history.save()
            
            logger.error(f"텍스트 방송 실패: {e}")
            raise
        
        return broadcast_history
    
    def execute_audio_broadcast(self, audio_file: File, target_rooms: Optional[List[str]] = None,
                               auto_off: bool = False, user=None) -> BroadcastHistory:
        """오디오 방송 실행 및 이력 저장"""
        # 방송 이력 생성
        broadcast_history = BroadcastHistory.objects.create(
            broadcast_type='audio',
            content=f"오디오 파일: {audio_file.name}",
            target_rooms=target_rooms or [],
            language='ko',
            auto_off=auto_off,
            status='pending',
            broadcasted_by=user
        )
        
        try:
            # API 호출
            api_response = self.api_service.broadcast_audio(
                audio_file=audio_file,
                target_rooms=target_rooms,
                auto_off=auto_off
            )
            
            # FastAPI 응답 로깅 및 처리
            logger.info(f"FastAPI 오디오 방송 응답: {api_response}")
            
            # FastAPI 응답을 broadcast_history에 저장
            broadcast_history.external_response = api_response
            
            # FastAPI 응답에서 파일명 추출하여 content 업데이트
            if api_response and 'filename' in api_response:
                actual_filename = api_response['filename']
                broadcast_history.content = f"오디오 파일: {actual_filename}"
                logger.info(f"실제 방송 파일명: {actual_filename}")
            
            # 성공 시 상태 업데이트
            broadcast_history.status = 'completed'
            broadcast_history.completed_at = timezone.now()
            broadcast_history.save()
            
            logger.info(f"오디오 방송 완료: {audio_file.name} -> FastAPI 응답: {api_response}")
            
        except Exception as e:
            # 실패 시 상태 업데이트
            broadcast_history.status = 'failed'
            broadcast_history.error_message = str(e)
            broadcast_history.save()
            
            logger.error(f"오디오 방송 실패: {e}")
            raise
        
        return broadcast_history
    
    def sync_devices(self) -> bool:
        """장치 매트릭스 동기화"""
        return self.api_service.sync_device_matrix()
    
    def get_broadcast_history(self, limit: int = 50) -> List[Dict]:
        """방송 이력 조회 - 딕셔너리 형태로 반환"""
        history_list = []
        histories = BroadcastHistory.objects.select_related('broadcasted_by', 'preview').all()[:limit]
        
        for history in histories:
            history_dict = {
                'id': history.id,
                'broadcast_type': history.broadcast_type,
                'broadcast_type_display': history.get_broadcast_type_display(),
                'content': history.content,
                'target_rooms': history.target_rooms,
                'language': history.language,
                'status': history.status,
                'status_display': history.get_status_display(),
                'broadcasted_by_username': history.broadcasted_by.username,
                'created_at': history.created_at.isoformat(),
                'completed_at': history.completed_at.isoformat() if history.completed_at else None,
            }
            
            # 프리뷰 정보 추가
            if history.preview:
                history_dict['preview'] = {
                    'preview_id': history.preview.preview_id,
                    'status': history.preview.status,
                    'created_at': history.preview.created_at.isoformat()
                }
            
            history_list.append(history_dict)
        
        return history_list
    
    def get_broadcast_history_by_user(self, user, limit: int = 50) -> List[Dict]:
        """사용자별 방송 이력 조회 - 딕셔너리 형태로 반환"""
        history_list = []
        histories = BroadcastHistory.objects.select_related('broadcasted_by', 'preview').filter(broadcasted_by=user)[:limit]
        
        for history in histories:
            history_dict = {
                'id': history.id,
                'broadcast_type': history.broadcast_type,
                'broadcast_type_display': history.get_broadcast_type_display(),
                'content': history.content,
                'target_rooms': history.target_rooms,
                'language': history.language,
                'status': history.status,
                'status_display': history.get_status_display(),
                'broadcasted_by_username': history.broadcasted_by.username,
                'created_at': history.created_at.isoformat(),
                'completed_at': history.completed_at.isoformat() if history.completed_at else None,
            }
            
            # 프리뷰 정보 추가
            if history.preview:
                history_dict['preview'] = {
                    'preview_id': history.preview.preview_id,
                    'status': history.preview.status,
                    'created_at': history.preview.created_at.isoformat()
                }
            
            history_list.append(history_dict)
        
        return history_list 