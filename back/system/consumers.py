import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from .views import update_health_cache, HEALTH_CHECK_CACHE_KEY, PIHOLE_STATS_CACHE_KEY
import datetime

logger = logging.getLogger(__name__)

class HealthCheckConsumer(AsyncWebsocketConsumer):
    """실시간 헬스체크 데이터를 WebSocket으로 전송하는 Consumer"""
    
    async def connect(self):
        """WebSocket 연결 시 호출"""
        # 인증 확인
        user = self.scope["user"]
        if isinstance(user, AnonymousUser) or not (user.is_staff or user.groups.filter(name='Teachers').exists()):
            logger.warning(f"Unauthorized WebSocket connection attempt from {user}")
            await self.close(code=4003)  # Forbidden
            return
        
        # 그룹에 추가
        self.room_group_name = 'health_monitor'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"WebSocket connection accepted for user: {user.username}")
        
        # 연결 즉시 현재 데이터 전송
        await self.send_health_data()
        
        # 주기적 업데이트 시작
        self.update_task = asyncio.create_task(self.periodic_update())
    
    async def disconnect(self, close_code):
        """WebSocket 연결 해제 시 호출"""
        # 그룹에서 제거
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # 업데이트 태스크 취소
        if hasattr(self, 'update_task'):
            self.update_task.cancel()
        
        logger.info(f"WebSocket disconnected with code: {close_code}")
    
    async def receive(self, text_data):
        """클라이언트로부터 메시지 수신"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'request_update':
                # 클라이언트가 업데이트를 요청한 경우
                await self.send_health_data()
            elif message_type == 'ping':
                # 연결 확인
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': datetime.datetime.now().isoformat()
                }))
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket client")
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {e}")
    
    async def periodic_update(self):
        """0.5초마다 헬스체크 데이터를 전송"""
        try:
            while True:
                await asyncio.sleep(0.5)  # 0.5초 대기
                await self.send_health_data()
        except asyncio.CancelledError:
            logger.info("Periodic update task cancelled")
        except Exception as e:
            logger.error(f"Error in periodic update: {e}")
    
    @database_sync_to_async
    def get_cached_health_data(self):
        """캐시에서 헬스체크 데이터를 가져옵니다"""
        system_health = cache.get(HEALTH_CHECK_CACHE_KEY, {})
        pihole_stats = cache.get(PIHOLE_STATS_CACHE_KEY, {})
        
        # 전체 상태 결정
        overall_status = 'healthy'
        if system_health.get('error') or pihole_stats.get('status') == 'offline':
            overall_status = 'warning'
        elif pihole_stats.get('status') == 'error':
            overall_status = 'error'
        
        return {
            'status': overall_status,
            'system': system_health,
            'pihole': pihole_stats,
            'timestamp': datetime.datetime.now().isoformat()
        }
    
    async def send_health_data(self):
        """헬스체크 데이터를 클라이언트에 전송"""
        try:
            health_data = await self.get_cached_health_data()
            
            await self.send(text_data=json.dumps({
                'type': 'health_update',
                'data': health_data
            }))
        except Exception as e:
            logger.error(f"Error sending health data: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'데이터 전송 오류: {str(e)}',
                'timestamp': datetime.datetime.now().isoformat()
            }))
    
    # 그룹 메시지 핸들러
    async def health_update(self, event):
        """그룹에서 헬스체크 업데이트 메시지를 받았을 때"""
        await self.send(text_data=json.dumps({
            'type': 'health_update',
            'data': event['data']
        })) 