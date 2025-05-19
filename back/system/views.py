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
from users.views import IsStaffUser
from django.core.cache import cache
from functools import lru_cache
import threading

# 시스템 상태 캐시 키
SYSTEM_STATUS_CACHE_KEY = 'system_status_data'
# 캐시 유효 시간 (초)
CACHE_TIMEOUT = 30

# 백그라운드에서 네트워크 상태 확인하는 함수
def check_network_status_async():
    network_checks = []
    network_status = 'offline'
    
    # 1. HTTP 요청으로 확인 (더 안정적인 방법)
    http_sites = [
        ('https://www.google.com', 'Google'),
        ('https://www.naver.com', 'Naver')
    ]
    
    # HTTP 요청 테스트 - 하나만 성공해도 충분
    for url, name in http_sites:
        try:
            start_time = time.time()
            response = requests.get(url, timeout=2)  # 타임아웃 감소
            response_time = round((time.time() - start_time) * 1000, 2)
            
            status = 'online' if response.status_code == 200 else 'error'
            if status == 'online':
                network_status = 'online'
                # 하나라도 성공하면 나머지 테스트 중단
                network_checks.append({
                    'server': name,
                    'status': status,
                    'response_time': f"{response_time}ms"
                })
                break
            
            network_checks.append({
                'server': name,
                'status': status,
                'response_time': f"{response_time}ms"
            })
        except Exception as e:
            network_checks.append({
                'server': name,
                'status': 'error'
            })
    
    # 2. 소켓 연결 테스트 (백업 방법) - HTTP 테스트가 실패한 경우에만 실행
    if network_status == 'offline':
        socket_servers = [
            ('8.8.8.8', 53, 'Google DNS')
        ]
        
        for server_ip, port, name in socket_servers:
            try:
                start_time = time.time()
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1)  # 타임아웃 감소
                result = s.connect_ex((server_ip, port))
                s.close()
                response_time = round((time.time() - start_time) * 1000, 2)
                
                status = 'online' if result == 0 else 'offline'
                if status == 'online':
                    network_status = 'online'
                    break
                
                network_checks.append({
                    'server': name,
                    'status': status,
                    'response_time': f"{response_time}ms" if status == 'online' else None
                })
            except Exception:
                network_checks.append({
                    'server': name,
                    'status': 'error'
                })
    
    return network_status, network_checks

# 백그라운드에서 시스템 상태 업데이트
def update_system_status_cache():
    try:
        # CPU 사용량
        cpu_percent = psutil.cpu_percent(interval=0.5)
        
        # 메모리 사용량
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # 디스크 사용량
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        
        # 네트워크 상태 확인 (비동기로 처리)
        network_status, network_checks = check_network_status_async()
        
        # 시스템 가동 시간
        boot_time = datetime.datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S")
        
        # 현재 시간
        current_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 시스템 로드 (1분, 5분, 15분)
        load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else (0, 0, 0)
        
        # 활성 프로세스 수
        active_processes = len(psutil.pids())
        
        # 상태 메시지 결정
        status_message = '정상 작동 중'
        if network_status == 'offline':
            status_message = '네트워크 연결 없음'
        elif network_status == 'limited':
            status_message = '제한된 네트워크 연결'
        
        # 결과 생성 - 배열 대신 객체 형태로 반환하도록 수정
        status_data = {
            'success': True,
            'status': status_message,
            'timestamp': current_time,
            'details': {
                'cpu': f'{cpu_percent}%',
                'memory': f'{memory_percent}%',
                'disk': f'{disk_percent}%',
                'network': {
                    'status': network_status,
                    'checks': network_checks if isinstance(network_checks, list) else []
                },
                'boot_time': boot_time,
                'load_avg': {
                    '1min': load_avg[0],
                    '5min': load_avg[1],
                    '15min': load_avg[2]
                },
                'active_processes': active_processes,
                'last_check': current_time
            }
        }
        
        # 캐시에 저장
        cache.set(SYSTEM_STATUS_CACHE_KEY, status_data, CACHE_TIMEOUT)
        return status_data
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"시스템 상태 업데이트 오류: {str(e)}\n{error_details}")
        return None

# 백그라운드에서 캐시 업데이트 시작
def start_background_update():
    def update_loop():
        while True:
            update_system_status_cache()
            time.sleep(CACHE_TIMEOUT - 5)  # 캐시 만료 직전에 업데이트
    
    thread = threading.Thread(target=update_loop, daemon=True)
    thread.start()

# 서버 시작 시 백그라운드 업데이트 시작
start_background_update()

@api_view(['GET'])
@permission_classes([IsStaffUser])  # 관리자와 교사 모두 시스템 상태를 볼 수 있도록 제한
def system_status(request):
    """
    시스템 상태 정보를 반환하는 API (관리자 및 교사 전용)
    캐싱을 통해 성능 최적화
    """
    # 캐시에서 상태 정보 가져오기
    status_data = cache.get(SYSTEM_STATUS_CACHE_KEY)
    
    # 캐시에 없으면 새로 생성
    if status_data is None:
        status_data = update_system_status_cache()
        
        # 업데이트 실패 시 오류 반환
        if status_data is None:
            return Response({
                'success': False,
                'status': '시스템 상태 조회 실패',
                'error': '상태 정보를 가져오는 중 오류가 발생했습니다.'
            }, status=500)
    
    # 응답 데이터 유효성 검사 및 수정
    if 'details' in status_data and 'network' in status_data['details']:
        network_data = status_data['details']['network']
        if 'checks' in network_data and not isinstance(network_data['checks'], list):
            network_data['checks'] = []
    
    return Response(status_data)
