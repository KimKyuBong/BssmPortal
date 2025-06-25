import os
import sys
import django
import logging
import mysql.connector
from datetime import datetime

# Django 환경 설정
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from devices.utils.kea_client import KeaClient

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('subnet_update.log')
    ]
)
logger = logging.getLogger('subnet_updater')

def get_kea_db_config():
    """KEA 데이터베이스 설정 가져오기"""
    return {
        "host": settings.DATABASES['kea']['HOST'],
        "user": settings.DATABASES['kea']['USER'],
        "password": settings.DATABASES['kea']['PASSWORD'],
        "database": settings.DATABASES['kea']['NAME']
    }

def update_subnet_ids():
    """잘못 등록된 서브넷 ID 업데이트"""
    try:
        # KEA 데이터베이스 연결
        db_config = {
            "host": "127.0.0.1",  # 올바른 호스트 이름으로 변경
            "user": "kea",
            "password": "Kea@Pass123!",
            "database": "kea"
        }
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # 학생 IP 대역에 서브넷 3으로 잘못 등록된 모든 호스트 가져오기
        cursor.execute("""
            SELECT host_id, HEX(dhcp_identifier) as mac_hex, 
                   INET_NTOA(ipv4_address) as ip_address, hostname
            FROM hosts
            WHERE dhcp4_subnet_id = 3
            AND (
                ipv4_address >= INET_ATON('10.129.57.0') AND ipv4_address <= INET_ATON('10.129.57.255')
                OR 
                ipv4_address >= INET_ATON('10.129.59.0') AND ipv4_address <= INET_ATON('10.129.59.255')
            )
        """)
        
        hosts_to_update = cursor.fetchall()
        logger.info(f"서브넷 ID 업데이트가 필요한 호스트 수: {len(hosts_to_update)}")
        
        updated_count = 0
        failed_count = 0
        
        for host in hosts_to_update:
            try:
                # MAC 주소 형식 변환
                mac_hex = host['mac_hex']
                formatted_mac = ':'.join([mac_hex[i:i+2] for i in range(0, len(mac_hex), 2)]).lower()
                ip = host['ip_address']
                host_id = host['host_id']
                hostname = host['hostname']
                
                logger.info(f"호스트 업데이트: ID={host_id}, MAC={formatted_mac}, IP={ip}, 이름={hostname}")
                
                # 1. DHCP 옵션 가져오기
                cursor.execute("""
                    SELECT code, HEX(value) as value_hex
                    FROM dhcp4_options
                    WHERE host_id = %s
                """, (host_id,))
                
                options = cursor.fetchall()
                
                # 2. 기존 호스트 및 옵션 삭제
                cursor.execute("DELETE FROM dhcp4_options WHERE host_id = %s", (host_id,))
                cursor.execute("DELETE FROM hosts WHERE host_id = %s", (host_id,))
                logger.info(f"호스트 ID {host_id}의 기존 레코드 삭제 완료")
                
                # 3. 올바른 서브넷 ID(4)로 호스트 다시 등록
                cursor.execute("""
                    INSERT INTO hosts (dhcp_identifier, dhcp_identifier_type, dhcp4_subnet_id, ipv4_address, hostname)
                    VALUES (UNHEX(%s), 0, 4, INET_ATON(%s), %s)
                """, (mac_hex, ip, hostname))
                
                new_host_id = cursor.lastrowid
                logger.info(f"호스트 ID {host_id} -> {new_host_id}로 새로 등록 완료 (서브넷 ID 4)")
                
                # 4. 기존 옵션 새 host_id로 다시 등록
                for option in options:
                    cursor.execute("""
                        INSERT INTO dhcp4_options (code, value, formatted_value, space, persistent, host_id, scope_id)
                        SELECT %s, UNHEX(%s), 
                            CASE 
                                WHEN %s = 3 THEN 
                                    CASE
                                        WHEN LEFT(%s, 10) = '10.129.57.' THEN '10.129.57.1'
                                        WHEN LEFT(%s, 10) = '10.129.59.' THEN '10.129.59.1'
                                        ELSE '10.129.50.1'
                                    END
                                WHEN %s = 6 THEN '10.129.55.253'
                                ELSE NULL
                            END,
                            'dhcp4', 1, %s, 3
                    """, (option['code'], option['value_hex'], 
                          option['code'], ip, ip, 
                          option['code'], 
                          new_host_id))
                
                # 5. lease4 테이블의 서브넷 ID도 업데이트
                cursor.execute("""
                    UPDATE lease4
                    SET subnet_id = 4
                    WHERE address = INET_ATON(%s)
                    AND subnet_id = 3
                """, (ip,))
                
                # 6. MAC 주소로 등록된 lease4 레코드도 업데이트
                cursor.execute("""
                    UPDATE lease4
                    SET subnet_id = 4
                    WHERE hwaddr = UNHEX(%s)
                    AND subnet_id = 3
                    AND (
                        address >= INET_ATON('10.129.57.0') AND address <= INET_ATON('10.129.57.255')
                        OR 
                        address >= INET_ATON('10.129.59.0') AND address <= INET_ATON('10.129.59.255')
                    )
                """, (mac_hex,))
                
                conn.commit()
                updated_count += 1
                logger.info(f"호스트 ID {new_host_id} (IP: {ip}) 업데이트 완료")
                
            except Exception as e:
                conn.rollback()
                failed_count += 1
                logger.error(f"호스트 ID {host_id} 업데이트 실패: {str(e)}")
        
        cursor.close()
        conn.close()
        
        logger.info(f"서브넷 ID 업데이트 결과: 성공={updated_count}, 실패={failed_count}, 전체={len(hosts_to_update)}")
        
    except Exception as e:
        logger.error(f"서브넷 ID 업데이트 중 오류 발생: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    logger.info("잘못 등록된 서브넷 ID 업데이트 시작")
    start_time = datetime.now()
    
    success = update_subnet_ids()
    
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    if success:
        logger.info(f"서브넷 ID 업데이트 완료 (소요 시간: {duration:.2f}초)")
    else:
        logger.error(f"서브넷 ID 업데이트 실패 (소요 시간: {duration:.2f}초)") 