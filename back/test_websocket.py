#!/usr/bin/env python3
"""
WebSocket 헬스체크 테스트 스크립트
실시간 헬스체크 데이터를 WebSocket으로 수신하는 테스트
"""

import asyncio
import websockets
import json
import ssl
from datetime import datetime

# WebSocket 설정
WS_URL = "ws://127.0.0.1:8000/ws/system/health/"

async def test_websocket():
    """WebSocket 연결을 테스트합니다."""
    print("🔌 WebSocket 연결 테스트 시작!")
    print(f"연결 URL: {WS_URL}")
    print("=" * 60)
    
    try:
        # SSL 비활성화 (개발 환경용)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        async with websockets.connect(WS_URL) as websocket:
            print("✅ WebSocket 연결 성공!")
            
            # 연결 확인용 ping 전송
            ping_msg = {
                "type": "ping",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(ping_msg))
            print("📤 Ping 메시지 전송")
            
            # 메시지 수신 카운터
            message_count = 0
            max_messages = 20  # 최대 20개 메시지 수신 후 종료
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    message_type = data.get('type')
                    message_count += 1
                    
                    current_time = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                    
                    if message_type == 'pong':
                        print(f"🏓 [{current_time}] Pong 수신")
                    
                    elif message_type == 'health_update':
                        health_data = data.get('data', {})
                        status = health_data.get('status', 'unknown')
                        
                        # 시스템 정보 추출
                        system = health_data.get('system', {})
                        cpu_usage = 'N/A'
                        memory_usage = 'N/A'
                        
                        if 'cpu' in system:
                            cpu_usage = f"{system['cpu'].get('usage_percent', 'N/A')}%"
                        
                        if 'memory' in system:
                            memory_usage = f"{system['memory'].get('percent', 'N/A')}%"
                        
                        # Pi-hole 정보 추출
                        pihole = health_data.get('pihole', {})
                        pihole_status = pihole.get('status', 'unknown')
                        blocked_today = pihole.get('blocked_today', 0)
                        
                        print(f"📊 [{current_time}] #{message_count:2d} 상태: {status}")
                        print(f"     CPU: {cpu_usage:>6} | 메모리: {memory_usage:>6} | Pi-hole: {pihole_status} (차단: {blocked_today:,})")
                    
                    elif message_type == 'error':
                        error_msg = data.get('message', '알 수 없는 오류')
                        print(f"❌ [{current_time}] 오류: {error_msg}")
                    
                    else:
                        print(f"❓ [{current_time}] 알 수 없는 메시지 타입: {message_type}")
                    
                    # 최대 메시지 수에 도달하면 종료
                    if message_count >= max_messages:
                        print(f"\n📝 최대 메시지 수({max_messages})에 도달하여 테스트를 종료합니다.")
                        break
                
                except json.JSONDecodeError:
                    print(f"❌ [{current_time}] 잘못된 JSON 메시지 수신")
                except Exception as e:
                    print(f"❌ [{current_time}] 메시지 처리 오류: {e}")
            
            print("\n✅ WebSocket 테스트 완료!")
            print(f"   총 수신 메시지: {message_count}개")
    
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket 연결 종료: {e}")
    except Exception as e:
        print(f"❌ WebSocket 연결 오류: {e}")
        print("   가능한 원인:")
        print("   1. 서버가 실행되지 않음")
        print("   2. WebSocket 경로가 잘못됨")
        print("   3. 인증이 필요함 (로그인 필요)")
        print("   4. Redis 또는 Channels 설정 문제")

async def test_with_auth_token():
    """인증 토큰과 함께 WebSocket을 테스트합니다."""
    print("🔐 인증이 필요한 경우의 WebSocket 테스트")
    print("현재 이 테스트는 구현되지 않았습니다.")
    print("실제 환경에서는 JWT 토큰을 WebSocket 헤더에 포함해야 합니다.")

def main():
    """메인 함수"""
    print("🚀 WebSocket 헬스체크 테스트 시작!")
    print("=" * 60)
    print("이 테스트는 다음을 확인합니다:")
    print("1. WebSocket 연결 가능 여부")
    print("2. 실시간 헬스체크 데이터 수신")
    print("3. 0.5초 간격 업데이트 확인")
    print("=" * 60)
    
    try:
        # WebSocket 테스트 실행
        asyncio.run(test_websocket())
        
        # 추가 테스트 (필요시 주석 해제)
        # asyncio.run(test_with_auth_token())
        
    except KeyboardInterrupt:
        print("\n\n⛔ 사용자가 테스트를 중단했습니다.")
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}")

if __name__ == "__main__":
    main() 