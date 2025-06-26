#!/usr/bin/env python3
"""
헬스체크 API 테스트 스크립트
백엔드 서버가 실행 중일 때 이 스크립트를 실행하여 API를 테스트할 수 있습니다.
"""

import requests
import json
import time
from datetime import datetime

# 서버 설정
BASE_URL = "http://127.0.0.1:8000"
API_ENDPOINTS = {
    'system_status': f"{BASE_URL}/api/system/status/",
    'refresh_health': f"{BASE_URL}/api/system/health/refresh/",
    'pihole_stats': f"{BASE_URL}/api/system/pihole/stats/",
    'login': f"{BASE_URL}/api/auth/login/",
}

def login():
    """관리자로 로그인하여 토큰을 가져옵니다."""
    print("🔐 관리자 로그인 중...")
    # 실제 관리자 계정 정보가 필요합니다
    login_data = {
        'username': 'admin',  # 실제 관리자 계정으로 변경
        'password': 'admin123'  # 실제 비밀번호로 변경
    }
    
    try:
        response = requests.post(API_ENDPOINTS['login'], json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get('access')
            if token:
                print("✅ 로그인 성공!")
                return token
            else:
                print("❌ 토큰을 가져올 수 없습니다.")
                return None
        else:
            print(f"❌ 로그인 실패: {response.status_code}")
            print(f"응답: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 로그인 오류: {e}")
        return None

def test_system_status(token):
    """시스템 상태 API를 테스트합니다."""
    print("\n📊 시스템 상태 테스트 중...")
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(API_ENDPOINTS['system_status'], headers=headers)
        if response.status_code == 200:
            data = response.json()
            print("✅ 시스템 상태 조회 성공!")
            print(f"   상태: {data.get('status')}")
            print(f"   업데이트 간격: {data.get('update_interval')}")
            
            # 시스템 정보 요약
            system = data.get('system', {})
            if 'cpu' in system:
                cpu = system['cpu']
                print(f"   CPU: {cpu.get('usage_percent', 'N/A')}%")
            
            if 'memory' in system:
                memory = system['memory']
                print(f"   메모리: {memory.get('percent', 'N/A')}%")
            
            # Pi-hole 정보 요약
            pihole = data.get('pihole', {})
            if pihole.get('status') == 'online':
                print(f"   Pi-hole: 온라인 (오늘 차단: {pihole.get('blocked_today', 0)}개)")
            else:
                print(f"   Pi-hole: {pihole.get('status', 'Unknown')}")
            
            return True
        else:
            print(f"❌ 시스템 상태 조회 실패: {response.status_code}")
            print(f"응답: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 시스템 상태 조회 오류: {e}")
        return False

def test_pihole_stats(token):
    """Pi-hole 통계 API를 테스트합니다."""
    print("\n🛡️ Pi-hole 통계 테스트 중...")
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(API_ENDPOINTS['pihole_stats'], headers=headers)
        if response.status_code == 200:
            data = response.json()
            pihole = data.get('pihole', {})
            print("✅ Pi-hole 통계 조회 성공!")
            print(f"   상태: {pihole.get('status')}")
            print(f"   오늘 쿼리: {pihole.get('queries_today', 0):,}개")
            print(f"   오늘 차단: {pihole.get('blocked_today', 0):,}개")
            print(f"   차단률: {pihole.get('blocked_percentage', 0):.1f}%")
            print(f"   차단 도메인 수: {pihole.get('domains_blocked', 0):,}개")
            print(f"   클라이언트 수: {pihole.get('clients', 0)}개")
            return True
        else:
            print(f"❌ Pi-hole 통계 조회 실패: {response.status_code}")
            print(f"응답: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Pi-hole 통계 조회 오류: {e}")
        return False

def test_refresh_health(token):
    """헬스체크 데이터 새로고침 API를 테스트합니다."""
    print("\n🔄 헬스체크 새로고침 테스트 중...")
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.post(API_ENDPOINTS['refresh_health'], headers=headers)
        if response.status_code == 200:
            data = response.json()
            print("✅ 헬스체크 새로고침 성공!")
            print(f"   메시지: {data.get('message')}")
            return True
        else:
            print(f"❌ 헬스체크 새로고침 실패: {response.status_code}")
            print(f"응답: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 헬스체크 새로고침 오류: {e}")
        return False

def monitor_updates(token, duration=10):
    """지정된 시간 동안 시스템 상태 업데이트를 모니터링합니다."""
    print(f"\n⏱️ {duration}초 동안 업데이트 모니터링...")
    headers = {'Authorization': f'Bearer {token}'}
    
    start_time = time.time()
    last_timestamp = None
    update_count = 0
    
    while time.time() - start_time < duration:
        try:
            response = requests.get(API_ENDPOINTS['system_status'], headers=headers)
            if response.status_code == 200:
                data = response.json()
                current_timestamp = data.get('timestamp')
                
                if last_timestamp != current_timestamp:
                    update_count += 1
                    system = data.get('system', {})
                    cpu_usage = system.get('cpu', {}).get('usage_percent', 'N/A')
                    memory_usage = system.get('memory', {}).get('percent', 'N/A')
                    
                    print(f"   업데이트 #{update_count} - CPU: {cpu_usage}%, 메모리: {memory_usage}% [{datetime.now().strftime('%H:%M:%S')}]")
                    last_timestamp = current_timestamp
            
            time.sleep(0.5)  # 0.5초마다 확인
        except Exception as e:
            print(f"   모니터링 오류: {e}")
            break
    
    print(f"✅ 모니터링 완료! {duration}초 동안 {update_count}번 업데이트됨")

def main():
    """메인 테스트 함수"""
    print("🚀 헬스체크 API 테스트 시작!")
    print("=" * 50)
    
    # 로그인
    token = login()
    if not token:
        print("❌ 로그인에 실패했습니다. 테스트를 종료합니다.")
        return
    
    # API 테스트
    success_count = 0
    total_tests = 0
    
    # 1. 시스템 상태 테스트
    total_tests += 1
    if test_system_status(token):
        success_count += 1
    
    # 2. Pi-hole 통계 테스트
    total_tests += 1
    if test_pihole_stats(token):
        success_count += 1
    
    # 3. 헬스체크 새로고침 테스트
    total_tests += 1
    if test_refresh_health(token):
        success_count += 1
    
    # 4. 업데이트 모니터링
    print("\n" + "=" * 50)
    monitor_updates(token, duration=10)
    
    # 결과 요약
    print("\n" + "=" * 50)
    print("📋 테스트 결과 요약:")
    print(f"   성공: {success_count}/{total_tests}")
    print(f"   성공률: {(success_count/total_tests*100):.1f}%")
    
    if success_count == total_tests:
        print("🎉 모든 테스트가 성공했습니다!")
    else:
        print("⚠️ 일부 테스트가 실패했습니다.")

if __name__ == "__main__":
    main() 