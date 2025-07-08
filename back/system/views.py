from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import psutil
import datetime
import os
import subprocess
import json
import socket
import time
import requests
from urllib.request import urlopen
from urllib.error import URLError
from core.permissions import SystemPermissions, IsAdminUser
from django.core.cache import cache
from functools import lru_cache
import threading
import logging

logger = logging.getLogger(__name__)

# 헬스체크 캐시 키
HEALTH_CHECK_CACHE_KEY = 'health_check_data'
PIHOLE_STATS_CACHE_KEY = 'pihole_stats_data'
# 캐시 유효 시간 (초) - 0.5초마다 업데이트
CACHE_TIMEOUT = 1

# Pi-hole 설정 - docker-compose.yaml에서 127.0.0.1:8888로 설정되어 있음
PIHOLE_HOST = "127.0.0.1:8888"
PIHOLE_API_URL = f"http://{PIHOLE_HOST}/admin/api.php"

def get_pihole_web_password():
    """Pi-hole 웹 패스워드를 가져옵니다."""
    try:
        # Docker 볼륨 마운트된 경로에서 패스워드 확인
        config_paths = [
            "/etc/pihole/setupVars.conf",
            "./pihole/etc-pihole/setupVars.conf",
            "/app/../pihole/etc-pihole/setupVars.conf"
        ]
        
        for path in config_paths:
            try:
                if os.path.exists(path):
                    with open(path, 'r') as f:
                        content = f.read()
                        for line in content.split('\n'):
                            if line.startswith('WEBPASSWORD='):
                                return line.split('=')[1].strip()
            except:
                continue
        
        logger.warning("Pi-hole 웹 패스워드를 찾을 수 없습니다.")
        return None
    except Exception as e:
        logger.error(f"Pi-hole 웹 패스워드 가져오기 실패: {e}")
        return None

def get_pihole_stats():
    """Pi-hole 통계를 가져옵니다."""
    # Pi-hole 기능 비활성화
    return {'status': 'disabled', 'message': 'Pi-hole 기능이 비활성화되었습니다.'}

def get_detailed_pihole_stats():
    """Pi-hole의 상세 통계를 가져옵니다."""
    # Pi-hole 기능 비활성화
    return {'status': 'disabled', 'message': 'Pi-hole 기능이 비활성화되었습니다.'}

def check_network_connectivity():
    """네트워크 연결성을 확인합니다."""
    try:
        # 빠른 연결성 체크
        test_sites = [
            ('8.8.8.8', 53),  # Google DNS
            ('1.1.1.1', 53),  # Cloudflare DNS
        ]
        
        for host, port in test_sites:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                result = sock.connect_ex((host, port))
                sock.close()
                if result == 0:
                    return {'status': 'online', 'test_host': host}
            except:
                continue
        
        return {'status': 'offline', 'error': '모든 테스트 실패'}
    
    except Exception as e:
        return {'status': 'error', 'error': str(e)}

def get_system_health():
    """시스템 헬스체크 데이터를 수집합니다."""
    try:
        # CPU 정보
        cpu_percent = psutil.cpu_percent(interval=0.1)  # 빠른 측정
        cpu_freq = psutil.cpu_freq()
        cpu_count = psutil.cpu_count()
        
        # 메모리 정보
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # 디스크 정보
        disk = psutil.disk_usage('/')
        disk_io = psutil.disk_io_counters()
        
        # 네트워크 정보
        net_io = psutil.net_io_counters()
        network_status = check_network_connectivity()
        
        # 프로세스 정보
        process_count = len(psutil.pids())
        
        # 시스템 가동시간
        boot_time = psutil.boot_time()
        uptime_seconds = time.time() - boot_time
        uptime_days = uptime_seconds // 86400
        uptime_hours = (uptime_seconds % 86400) // 3600
        uptime_minutes = (uptime_seconds % 3600) // 60
        
        # 시스템 로드 (Linux/Unix 전용)
        load_avg = (0, 0, 0)
        try:
            load_avg = os.getloadavg()
        except (OSError, AttributeError):
            pass
        
        # 온도 정보 (가능한 경우)
        temperatures = {}
        try:
            temps = psutil.sensors_temperatures()
            if temps:
                for name, entries in temps.items():
                    if entries:
                        temperatures[name] = [{'label': entry.label or 'Unknown', 
                                            'current': entry.current, 
                                            'high': entry.high,
                                            'critical': entry.critical} for entry in entries]
        except:
            pass
        
        return {
            'timestamp': datetime.datetime.now().isoformat(),
            'cpu': {
                'usage_percent': round(cpu_percent, 1),
                'frequency': {
                    'current': round(cpu_freq.current, 1) if cpu_freq else 0,
                    'min': round(cpu_freq.min, 1) if cpu_freq else 0,
                    'max': round(cpu_freq.max, 1) if cpu_freq else 0
                } if cpu_freq else None,
                'count': cpu_count,
                'load_avg': {
                    '1min': round(load_avg[0], 2),
                    '5min': round(load_avg[1], 2),
                    '15min': round(load_avg[2], 2)
                }
            },
            'memory': {
                'total': memory.total,
                'available': memory.available,
                'used': memory.used,
                'free': memory.free,
                'percent': round(memory.percent, 1),
                'swap': {
                    'total': swap.total,
                    'used': swap.used,
                    'free': swap.free,
                    'percent': round(swap.percent, 1)
                }
            },
            'disk': {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': round(disk.percent, 1),
                'io': {
                    'read_bytes': disk_io.read_bytes if disk_io else 0,
                    'write_bytes': disk_io.write_bytes if disk_io else 0,
                    'read_count': disk_io.read_count if disk_io else 0,
                    'write_count': disk_io.write_count if disk_io else 0
                } if disk_io else None
            },
            'network': {
                'status': network_status,
                'io': {
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_recv': net_io.bytes_recv,
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv,
                    'errin': net_io.errin,
                    'errout': net_io.errout,
                    'dropin': net_io.dropin,
                    'dropout': net_io.dropout
                }
            },
            'system': {
                'processes': process_count,
                'boot_time': datetime.datetime.fromtimestamp(boot_time).isoformat(),
                'uptime': {
                    'days': int(uptime_days),
                    'hours': int(uptime_hours),
                    'minutes': int(uptime_minutes),
                    'total_seconds': int(uptime_seconds)
                },
                'temperatures': temperatures
            }
        }
    
    except Exception as e:
        logger.error(f"시스템 헬스체크 수집 실패: {e}")
        return {'error': f'시스템 정보 수집 실패: {str(e)}'}

def update_health_cache():
    """헬스체크 캐시를 업데이트합니다."""
    try:
        # 시스템 헬스체크
        system_health = get_system_health()
        cache.set(HEALTH_CHECK_CACHE_KEY, system_health, CACHE_TIMEOUT + 5)
        
        # Pi-hole 통계
        pihole_stats = get_detailed_pihole_stats()
        cache.set(PIHOLE_STATS_CACHE_KEY, pihole_stats, CACHE_TIMEOUT + 5)
        
        return True
    except Exception as e:
        logger.error(f"헬스체크 캐시 업데이트 실패: {e}")
        return False

# 백그라운드 업데이트 스레드
class HealthCheckUpdater:
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._update_loop, daemon=True)
            self.thread.start()
            logger.info("헬스체크 백그라운드 업데이터 시작됨")
    
    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1)
        logger.info("헬스체크 백그라운드 업데이터 중지됨")
    
    def _update_loop(self):
        while self.running:
            try:
                update_health_cache()
                time.sleep(0.5)  # 0.5초마다 업데이트
            except Exception as e:
                logger.error(f"헬스체크 업데이트 루프 오류: {e}")
                time.sleep(1)  # 오류 시 1초 대기

# 글로벌 업데이터 인스턴스
health_updater = HealthCheckUpdater()

# 서버 시작 시 백그라운드 업데이터 시작
health_updater.start()

@api_view(['GET'])
@permission_classes([SystemPermissions])
def system_status(request):
    """
    실시간 시스템 상태 정보를 반환하는 API (관리자 전용)
    0.5초마다 업데이트되는 헬스체크 데이터 제공
    """
    try:
        # 캐시에서 데이터 가져오기
        system_health = cache.get(HEALTH_CHECK_CACHE_KEY)
        pihole_stats = cache.get(PIHOLE_STATS_CACHE_KEY)
        
        # 캐시가 없으면 즉시 생성
        if system_health is None or pihole_stats is None:
            update_health_cache()
            system_health = cache.get(HEALTH_CHECK_CACHE_KEY, {})
            pihole_stats = cache.get(PIHOLE_STATS_CACHE_KEY, {})
        
        # 전체 상태 결정
        overall_status = 'healthy'
        if system_health.get('error') or pihole_stats.get('status') == 'offline':
            overall_status = 'warning'
        elif pihole_stats.get('status') == 'error':
            overall_status = 'error'
        
        return Response({
            'success': True,
            'status': overall_status,
            'timestamp': datetime.datetime.now().isoformat(),
            'update_interval': '0.5초',
            'system': system_health,
            'pihole': pihole_stats,
            'metadata': {
                'cache_keys': {
                    'system': HEALTH_CHECK_CACHE_KEY,
                    'pihole': PIHOLE_STATS_CACHE_KEY
                },
                'cache_timeout': CACHE_TIMEOUT,
                'updater_running': health_updater.running
            }
        })
    
    except Exception as e:
        logger.error(f"시스템 상태 API 오류: {e}")
        return Response({
            'success': False,
            'status': 'error',
            'error': f'시스템 상태 조회 실패: {str(e)}',
            'timestamp': datetime.datetime.now().isoformat()
        }, status=500)

@api_view(['POST'])
@permission_classes([SystemPermissions])
def refresh_health_data(request):
    """헬스체크 데이터를 강제로 새로고침합니다."""
    try:
        success = update_health_cache()
        if success:
            return Response({
                'success': True,
                'message': '헬스체크 데이터가 새로고침되었습니다.',
                'timestamp': datetime.datetime.now().isoformat()
            })
        else:
            return Response({
                'success': False,
                'message': '헬스체크 데이터 새로고침에 실패했습니다.',
                'timestamp': datetime.datetime.now().isoformat()
            }, status=500)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'timestamp': datetime.datetime.now().isoformat()
        }, status=500)

@api_view(['GET'])
@permission_classes([SystemPermissions])
def pihole_detailed_stats(request):
    """Pi-hole의 상세 통계만 반환합니다."""
    try:
        stats = get_detailed_pihole_stats()
        return Response({
            'success': True,
            'timestamp': datetime.datetime.now().isoformat(),
            'pihole': stats
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e),
            'timestamp': datetime.datetime.now().isoformat()
        }, status=500)
