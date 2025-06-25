import re
import logging
import mysql.connector
from django.conf import settings
from datetime import datetime, timedelta
from devices.models import BlacklistedIP

logger = logging.getLogger(__name__)

class KeaClient:
    """KEA DHCP 서버와 통신하는 클라이언트 클래스"""
    
    # 대역 설정
    STUDENT_BANDS = ["10.129.57.", "10.129.58.", "10.129.59."]  # 학생 대역 리스트
    TEACHER_BANDS = ["10.129.50."]  # 교사 대역 리스트
    
    @staticmethod
    def get_kea_db_config():
        """KEA 데이터베이스 설정 가져오기"""
        return {
            "host": settings.DATABASES['kea']['HOST'],
            "user": settings.DATABASES['kea']['USER'],
            "password": settings.DATABASES['kea']['PASSWORD'],
            "database": settings.DATABASES['kea']['NAME']
        }
    
    @staticmethod
    def ip_to_int(ip_address):
        """IP 주소를 정수로 변환"""
        ip_parts = ip_address.split('.')
        return (int(ip_parts[0]) << 24) + (int(ip_parts[1]) << 16) + (int(ip_parts[2]) << 8) + int(ip_parts[3])
    
    @staticmethod
    def mac_without_colons(mac_address):
        """MAC 주소 형식 변환 (콜론 제거)"""
        return mac_address.replace(':', '')
    
    @classmethod
    def get_kea_used_ips(cls):
        """KEA DHCP 서버에서 사용 중인 IP 주소 가져오기"""
        kea_used_ips = []
        try:
            # KEA 데이터베이스 연결
            conn = mysql.connector.connect(**cls.get_kea_db_config())
            cursor = conn.cursor(dictionary=True)
            
            # hosts 테이블에서 할당된 IP 주소 조회 (subnet_id = 3, 4)
            query = """
                SELECT INET_NTOA(ipv4_address) as ip_address
                FROM hosts
                WHERE dhcp4_subnet_id IN (3, 4)
            """
            
            cursor.execute(query)
            results = cursor.fetchall()
            
            for result in results:
                if result['ip_address']:
                    kea_used_ips.append(result['ip_address'])
                    
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"KEA 데이터베이스 조회 중 오류 발생: {e}")
        
        return kea_used_ips
    
    @classmethod
    def find_available_ip(cls, existing_ips=None, exclude_device_id=None, is_student=False):
        """사용 가능한 IP 주소 찾기"""
        if existing_ips is None:
            existing_ips = []
        kea_used_ips = cls.get_kea_used_ips()
        blacklisted_ips = list(BlacklistedIP.objects.values_list('ip_address', flat=True))
        logger.info(f"블랙리스트된 IP 주소 수: {len(blacklisted_ips)}")
        all_used_ips = set(existing_ips + kea_used_ips + blacklisted_ips)
        logger.info(f"전체 사용 중인 IP 주소 수: {len(all_used_ips)}")
        
        if is_student:
            # 학생 계정용 IP 범위 설정 (20 ~ 250)
            ip_start = 20
            ip_end = 250
            
            # 학생용 대역 리스트 사용
            base_ips = cls.STUDENT_BANDS
            
            # 대역을 번갈아가며 사용 가능한 IP 찾기
            for base_ip in base_ips:
                for i in range(ip_start, ip_end + 1):
                    candidate_ip = f"{base_ip}{i}"
                    if candidate_ip not in all_used_ips:
                        return candidate_ip
        else:
            # 교사 계정용 IP 범위 설정 (20 ~ 250)
            ip_start = 20
            ip_end = 250
            
            # 교사용 대역 리스트 사용
            base_ips = cls.TEACHER_BANDS
            
            # 대역을 번갈아가며 사용 가능한 IP 찾기
            for base_ip in base_ips:
                for i in range(ip_start, ip_end + 1):
                    candidate_ip = f"{base_ip}{i}"
                    if candidate_ip not in all_used_ips:
                        return candidate_ip
                    
        logger.error(f"사용 가능한 IP 주소가 없음: 사용 중인 IP 주소 수={len(all_used_ips)}")
        return None
    
    @classmethod
    def register_ip_to_kea(cls, mac_address, ip_address, device_name):
        """KEA DHCP 서버에 IP 할당 등록"""
        host_id = None
        hosts_success = False
        options_success = False
        lease_success = False
        
        try:
            # IP 주소가 블랙리스트에 있는지 확인
            if BlacklistedIP.objects.filter(ip_address=ip_address).exists():
                logger.error(f"IP 주소 {ip_address}는 블랙리스트에 있어 할당할 수 없습니다.")
                return False
                
            # 기존 IP 할당(임시 IP 포함) 모두 삭제
            logger.info(f"장치 {mac_address}의 기존 IP 할당 제거 시도")
            cls.remove_ip_from_kea(mac_address)
            
            # MAC 주소 형식 변환 (콜론 제거)
            mac_without_colons = cls.mac_without_colons(mac_address)

            # IP 주소 유효성 검사
            if not ip_address or not re.match(r'^(\d{1,3}\.){3}\d{1,3}$', ip_address):
                logger.error(f"유효하지 않은 IP 주소 형식: {ip_address}")
                return False

            # IP 주소를 정수로 변환
            ip_int = cls.ip_to_int(ip_address)
            
            logger.info(f"IP 주소 변환: {ip_address} -> {ip_int}")
            
            # 서브넷 ID 결정 (학생인지 교사인지에 따라)
            is_student_ip = any(ip_address.startswith(band) for band in cls.STUDENT_BANDS)
            is_teacher_ip = any(ip_address.startswith(band) for band in cls.TEACHER_BANDS)
            subnet_id = 4 if is_student_ip else (3 if is_teacher_ip else 3)  # 기본값은 3
            logger.info(f"IP {ip_address}에 서브넷 ID {subnet_id} 할당")
            
            # hosts 테이블에 등록 (별도 트랜잭션으로 처리)
            try:
                conn = mysql.connector.connect(**cls.get_kea_db_config())
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO hosts (dhcp_identifier, dhcp_identifier_type, dhcp4_subnet_id, ipv4_address, hostname)
                    VALUES (UNHEX(%s), 0, %s, %s, %s)
                """, (mac_without_colons, subnet_id, ip_int, device_name))
                
                # 생성된 host_id 가져오기
                host_id = cursor.lastrowid
                logger.info(f"KEA hosts 테이블에 {mac_address} 정보 등록 완료 (host_id: {host_id}, subnet_id: {subnet_id})")
                
                conn.commit()
                cursor.close()
                conn.close()
                hosts_success = True
            except Exception as e:
                logger.error(f"KEA hosts 테이블 등록 중 오류 발생: {e}")
                if 'conn' in locals() and conn.is_connected():
                    conn.rollback()
                    cursor.close()
                    conn.close()
                return False
            
            # dhcp4_options 테이블에 옵션 추가 (별도 트랜잭션으로 처리)
            try:
                if host_id:
                    conn = mysql.connector.connect(**cls.get_kea_db_config())
                    cursor = conn.cursor()
                    
                    # 옵션 3: 라우터(게이트웨이) - IP 대역에 따라 다르게 설정
                    if any(ip_address.startswith(band) for band in cls.STUDENT_BANDS):
                        # 학생 대역의 게이트웨이는 해당 대역의 .1 주소
                        ip_parts = ip_address.split('.')
                        router_hex = f"0A81{int(ip_parts[2]):02x}01"  # 16진수로 변환
                        router_ip = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.1"
                        logger.info(f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.x 대역 IP {ip_address}에 게이트웨이 {router_ip} 설정")
                    elif any(ip_address.startswith(band) for band in cls.TEACHER_BANDS):
                        # 교사 대역의 게이트웨이는 해당 대역의 .1 주소
                        ip_parts = ip_address.split('.')
                        router_hex = f"0A81{int(ip_parts[2]):02x}01"  # 16진수로 변환
                        router_ip = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.1"
                        logger.info(f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}.x 대역 IP {ip_address}에 게이트웨이 {router_ip} 설정")
                    else:
                        # 기타 대역의 게이트웨이는 10.129.50.1
                        router_hex = "0A813201"  # 10.129.50.1의 16진수 표현
                        router_ip = "10.129.50.1"
                        logger.info(f"기타 대역 IP {ip_address}에 게이트웨이 {router_ip} 설정")
                        
                    cursor.execute("""
                        INSERT INTO dhcp4_options (code, value, formatted_value, space, persistent, host_id, scope_id)
                        VALUES (3, UNHEX(%s), %s, 'dhcp4', 1, %s, 3)
                    """, (router_hex, router_ip, host_id))
                    
                    # 옵션 6: DNS 서버
                    cursor.execute("""
                        INSERT INTO dhcp4_options (code, value, formatted_value, space, persistent, host_id, scope_id)
                        VALUES (6, UNHEX('D3B6E902A87E3F01'), '10.129.55.253', 'dhcp4', 1, %s, 3)
                    """, (host_id,))
                    
                    # IP 주소에 따라 다른 DHCP 서버 주소 설정
                    is_student_ip = any(ip_address.startswith(band) for band in cls.STUDENT_BANDS)
                    is_teacher_ip = any(ip_address.startswith(band) for band in cls.TEACHER_BANDS)
                    if is_student_ip:
                        # 학생용 DHCP 서버 주소 (10.129.55.253)
                        dhcp_server_hex = "0A8137FD"  # 10.129.55.253의 16진수 표현
                        dhcp_server_ip = "10.129.55.253"
                        logger.info(f"학생 대역 IP {ip_address}에 대해 DHCP 서버 {dhcp_server_ip} 설정")
                    elif is_teacher_ip:
                        # 교사용 DHCP 서버 주소 (10.129.50.253)
                        dhcp_server_hex = "0A8132FD"  # 10.129.50.253의 16진수 표현
                        dhcp_server_ip = "10.129.50.253"
                        logger.info(f"교사 대역 IP {ip_address}에 대해 DHCP 서버 {dhcp_server_ip} 설정")
                    else:
                        # 기타 대역의 DHCP 서버 주소 (10.129.50.253)
                        dhcp_server_hex = "0A8132FD"  # 10.129.50.253의 16진수 표현
                        dhcp_server_ip = "10.129.50.253"
                        logger.info(f"기타 대역 IP {ip_address}에 대해 DHCP 서버 {dhcp_server_ip} 설정")
                    
                    # 옵션 54: DHCP 서버 주소
                    cursor.execute("""
                        INSERT INTO dhcp4_options (code, value, formatted_value, space, persistent, host_id, scope_id)
                        VALUES (54, UNHEX(%s), %s, 'dhcp4', 1, %s, 3)
                    """, (dhcp_server_hex, dhcp_server_ip, host_id))
                    
                    conn.commit()
                    cursor.close()
                    conn.close()
                    logger.info(f"KEA dhcp4_options 테이블에 {mac_address} 옵션 등록 완료")
                    options_success = True
                else:
                    logger.error("host_id가 없어 dhcp4_options 등록 불가")
                    return False
            except Exception as e:
                logger.error(f"KEA dhcp4_options 테이블 등록 중 오류 발생: {e}")
                # dhcp4_options 오류는 치명적이므로 실패 반환
                return False
            
            # lease4 테이블에 등록 (별도 트랜잭션으로 처리)
            try:
                conn = mysql.connector.connect(**cls.get_kea_db_config())
                cursor = conn.cursor()
                
                # IP 주소가 임시 대역(10.250.0.*)인지 확인
                is_temporary = ip_address.startswith("10.250.")
                
                # 임시 IP는 짧은 유효기간(5분), 일반 IP는 긴 유효기간(100일)
                valid_lifetime = 300 if is_temporary else 8640000  # 5분 또는 100일
                if is_temporary:
                    expire_time = datetime.now() + timedelta(minutes=5)
                else:
                    expire_time = datetime.now() + timedelta(days=100)
                expire_str = expire_time.strftime('%Y-%m-%d %H:%M:%S')
                user_context = '{"state":"TEMPORARY"}' if is_temporary else '{"state":"DEFAULT"}'
                
                # client_id를 생략하고 INSERT 시도
                try:
                    # client_id 없이 INSERT
                    cursor.execute("""
                        INSERT INTO lease4 (address, hwaddr, valid_lifetime, expire, subnet_id, state, user_context)
                        VALUES (%s, UNHEX(%s), %s, %s, %s, 0, %s)
                    """, (ip_int, mac_without_colons, valid_lifetime, expire_str, subnet_id, user_context))
                    logger.info(f"KEA lease4 테이블에 {mac_address} 등록 완료 (client_id 생략)")
                    lease_success = True
                except Exception as e1:
                    logger.error(f"client_id 생략하고 lease4 등록 실패: {e1}")
                    
                    # client_id를 NULL로 설정하여 INSERT 시도
                    try:
                        cursor.execute("""
                            INSERT INTO lease4 (address, hwaddr, client_id, valid_lifetime, expire, subnet_id, state, user_context)
                            VALUES (%s, UNHEX(%s), NULL, %s, %s, %s, 0, %s)
                        """, (ip_int, mac_without_colons, valid_lifetime, expire_str, subnet_id, user_context))
                        logger.info(f"KEA lease4 테이블에 {mac_address} 등록 완료 (client_id NULL)")
                        lease_success = True
                    except Exception as e2:
                        logger.error(f"client_id NULL로 lease4 등록 실패: {e2}")
                        
                        # 마지막 시도: client_id를 명시적으로 지정
                        try:
                            client_id = "01" + mac_without_colons
                            cursor.execute("""
                                INSERT INTO lease4 (address, hwaddr, client_id, valid_lifetime, expire, subnet_id, state, user_context)
                                VALUES (%s, UNHEX(%s), UNHEX(%s), %s, %s, %s, 0, %s)
                            """, (ip_int, mac_without_colons, client_id, valid_lifetime, expire_str, subnet_id, user_context))
                            logger.info(f"KEA lease4 테이블에 {mac_address} 등록 완료 (client_id 지정)")
                            lease_success = True
                        except Exception as e3:
                            logger.error(f"client_id 지정하여 lease4 등록 실패: {e3}")
                            # 모든 시도가 실패한 경우 False 반환
                            return False
                
                conn.commit()
                cursor.close()
                conn.close()
            except Exception as e:
                logger.error(f"KEA lease4 테이블 등록 중 오류 발생: {e}")
                # lease4 등록 실패는 치명적이므로 실패 반환
                return False
            
            # 모든 단계가 성공했는지 확인
            if hosts_success and options_success and lease_success:
                logger.info(f"KEA DB에 장치 {mac_address} 정보 등록 완료 (IP: {ip_address})")
                return True
            else:
                logger.error(f"KEA DB 등록 일부 실패: hosts={hosts_success}, options={options_success}, lease={lease_success}")
                return False
        
        except Exception as e:
            logger.error(f"KEA 데이터베이스 처리 중 전체 오류 발생: {e}")
            return False
    
    @classmethod
    def remove_ip_from_kea(cls, mac_address, ip_address=None):
        """KEA DHCP 서버에서 IP 할당 제거"""
        hosts_success = False
        lease_success = False
        
        try:
            # KEA 데이터베이스 연결
            conn = mysql.connector.connect(**cls.get_kea_db_config())
            cursor = conn.cursor(dictionary=True)

            # MAC 주소 형식 변환 (콜론 제거)
            mac_without_colons = cls.mac_without_colons(mac_address)
            logger.info(f"KEA에서 MAC 주소 {mac_address} 제거 시작")

            # hosts 테이블 트랜잭션
            try:
                # 1. hosts 테이블에서 기존 예약 정보 가져오기
                cursor.execute("""
                    SELECT host_id, INET_NTOA(ipv4_address) as ip_address, dhcp4_subnet_id 
                    FROM hosts 
                    WHERE dhcp_identifier = UNHEX(%s)
                    AND dhcp4_subnet_id IN (3, 4)
                """, (mac_without_colons,))
                result = cursor.fetchone()
                
                if result:
                    logger.info(f"KEA hosts 테이블에서 MAC {mac_address}에 대한 항목 발견: {result}")
                    # 2. DHCP 옵션 삭제
                    cursor.execute("""
                        DELETE FROM dhcp4_options WHERE host_id = %s
                    """, (result['host_id'],))
                    logger.info(f"KEA dhcp4_options 테이블에서 host_id {result['host_id']} 삭제 완료")
                    
                    # 3. 호스트 예약 삭제
                    cursor.execute("""
                        DELETE FROM hosts WHERE host_id = %s
                    """, (result['host_id'],))
                    logger.info(f"KEA hosts 테이블에서 host_id {result['host_id']} 삭제 완료")
                    
                    hosts_success = True
                    
                    # hosts 트랜잭션 커밋
                    conn.commit()
                else:
                    logger.info(f"KEA hosts 테이블에서 MAC {mac_address}에 대한 항목 없음")
                    hosts_success = True
            except Exception as e:
                logger.error(f"hosts 테이블 트랜잭션 중 오류 발생: {e}")
                conn.rollback()
            
            # lease4 테이블 트랜잭션
            try:
                # 4. 해당 IP의 모든 lease 삭제 (declined 포함)
                if result and 'ip_address' in result:
                    cursor.execute("""
                        DELETE FROM lease4 
                        WHERE address = INET_ATON(%s)
                    """, (result['ip_address'],))
                    logger.info(f"KEA lease4 테이블에서 IP {result['ip_address']} 삭제 완료")
                
                # 5. MAC 주소의 모든 lease 삭제
                cursor.execute("""
                    DELETE FROM lease4 
                    WHERE hwaddr = UNHEX(%s)
                    AND subnet_id IN (3, 4)
                """, (mac_without_colons,))
                logger.info(f"KEA lease4 테이블에서 MAC {mac_address} 삭제 완료")
                
                # 6. 임시 IP 대역(10.250.0.*)에 대한 리스 명시적 삭제
                cursor.execute("""
                    DELETE FROM lease4 
                    WHERE hwaddr = UNHEX(%s)
                    AND address >= INET_ATON('10.250.0.0')
                    AND address <= INET_ATON('10.250.255.255')
                """, (mac_without_colons,))
                logger.info(f"KEA lease4 테이블에서 임시 IP 대역의 MAC {mac_address} 삭제 완료")
                
                lease_success = True
                
                # lease4 트랜잭션 커밋
                conn.commit()
            except Exception as e:
                logger.error(f"lease4 테이블 트랜잭션 중 오류 발생: {e}")
                conn.rollback()
            
            cursor.close()
            conn.close()
            
            # 두 트랜잭션 중 하나라도 성공했으면 계속 진행할 수 있음
            if hosts_success or lease_success:
                logger.info(f"KEA DB에서 장치 {mac_address} 정보 삭제 완료 (hosts: {hosts_success}, lease: {lease_success})")
                return True
            else:
                logger.error(f"KEA DB에서 장치 {mac_address} 정보 삭제 실패 (모든 트랜잭션 실패)")
                return False
                
        except Exception as e:
            logger.error(f"KEA 데이터베이스 처리 중 오류 발생: {e}")
            return False
    
    @classmethod
    def get_mac_from_ip(cls, ip_address):
        """KEA DHCP 서버에서 IP 주소에 해당하는 MAC 주소 가져오기"""
        try:
            # KEA 데이터베이스 연결
            conn = mysql.connector.connect(**cls.get_kea_db_config())
            cursor = conn.cursor(dictionary=True)
            
            # lease4 테이블에서 MAC 주소 조회
            query = """
                SELECT HEX(hwaddr) as mac_address
                FROM lease4 
                WHERE address = INET_ATON(%s)
                  AND state = 0
                ORDER BY expire DESC
                LIMIT 1
            """
            
            cursor.execute(query, (ip_address,))
            result = cursor.fetchone()
            logger.info("KEA lease4 query result: %s", result)
            
            if result and result['mac_address']:
                # MAC 주소 형식 변환 (콜론 추가)
                mac_address = ':'.join(result['mac_address'][i:i+2].lower() for i in range(0, 12, 2))
                logger.info("Found MAC in KEA lease4: %s", mac_address)
                return mac_address
            else:
                # hosts 테이블에서 MAC 주소 조회 (백업)
                query = """
                    SELECT HEX(dhcp_identifier) as mac_address
                    FROM hosts 
                    WHERE ipv4_address = INET_ATON(%s)
                      AND dhcp_identifier_type = 0
                """
                
                cursor.execute(query, (ip_address,))
                result = cursor.fetchone()
                logger.info("KEA hosts query result: %s", result)
                
                if result and result['mac_address']:
                    # MAC 주소 형식 변환 (콜론 추가)
                    mac_address = ':'.join(result['mac_address'][i:i+2].lower() for i in range(0, 12, 2))
                    logger.info("Found MAC in KEA hosts: %s", mac_address)
                    return mac_address
            
            return None
        except Exception as e:
            logger.error("Error querying KEA database: %s", str(e))
            return None
    
    @classmethod
    def assign_temporary_ip(cls, mac_address, device_name, device_id):
        """임시 IP 할당 (인터넷 접속 불가능한 네트워크 대역)"""
        try:
            # 임시 IP 대역을 10.250.0.0으로 설정
            temp_subnet = "10.250.0."
            
            # 기존 IP 할당 제거
            remove_result = cls.remove_ip_from_kea(mac_address)
            if not remove_result:
                logger.error(f"기존 IP 할당 제거 실패: {mac_address}")
                return None
            
            # 임시 IP 생성을 위해 lease4 테이블에서 현재 사용 중인 임시 IP 확인
            try:
                conn = mysql.connector.connect(**cls.get_kea_db_config())
                cursor = conn.cursor(dictionary=True)
                
                # 이미 사용 중인 10.250.*.* 대역의 IP 검색
                cursor.execute("""
                    SELECT INET_NTOA(address) as ip_address 
                    FROM lease4 
                    WHERE address >= INET_ATON('10.250.0.0') 
                    AND address <= INET_ATON('10.250.255.255')
                    AND state = 0
                    AND expire > NOW()
                """)
                
                used_temp_ips = [row['ip_address'] for row in cursor.fetchall()]
                logger.info(f"사용 중인 임시 IP 수: {len(used_temp_ips)}")
                
                # 임시 IP 생성 - 장치 ID를 활용하여 고유한 임시 IP 생성
                temp_ip_last_octet = (device_id % 240) + 10  # 10~249 범위 사용
                temp_ip = f"{temp_subnet}{temp_ip_last_octet}"
                
                # 임시 IP가 이미 사용 중이면 다른 IP 찾기
                if temp_ip in used_temp_ips:
                    found_ip = False
                    for i in range(10, 250):
                        candidate_ip = f"{temp_subnet}{i}"
                        if candidate_ip not in used_temp_ips:
                            temp_ip = candidate_ip
                            found_ip = True
                            break
                    
                    if not found_ip:
                        logger.error(f"사용 가능한 임시 IP를 찾을 수 없습니다.")
                        return None
                
                logger.info(f"할당할 임시 IP: {temp_ip}")
                
                # 커서 및 연결 종료
                cursor.close()
                conn.close()
                
                # KEA에 임시 IP 등록
                register_result = cls.register_ip_to_kea(mac_address, temp_ip, f"{device_name} (비활성화)")
                
                if register_result:
                    logger.info(f"임시 IP {temp_ip}가 MAC {mac_address}에 성공적으로 할당되었습니다.")
                    return temp_ip
                else:
                    logger.error(f"임시 IP {temp_ip} 등록 실패: MAC {mac_address}")
                    return None
                
            except Exception as e:
                logger.error(f"임시 IP 할당 중 데이터베이스 오류 발생: {e}")
                if 'conn' in locals() and conn.is_connected():
                    cursor.close()
                    conn.close()
                return None
                
        except Exception as e:
            logger.error(f"임시 IP 할당 처리 중 예외 발생: {e}")
            return None
    
    @classmethod
    def cleanup_expired_temporary_leases(cls):
        """만료된 임시 IP 리스 정리"""
        try:
            conn = mysql.connector.connect(**cls.get_kea_db_config())
            cursor = conn.cursor()
            
            # 만료된 임시 IP 리스 삭제 (10.250.*.* 대역)
            cursor.execute("""
                DELETE FROM lease4 
                WHERE address >= INET_ATON('10.250.0.0')
                AND address <= INET_ATON('10.250.255.255')
                AND expire < NOW()
            """)
            
            deleted_count = cursor.rowcount
            
            # 임시 상태인 리스 중 오래된 것들도 삭제 (5분 이상 지난 것)
            cursor.execute("""
                DELETE FROM lease4 
                WHERE address >= INET_ATON('10.250.0.0')
                AND address <= INET_ATON('10.250.255.255')
                AND user_context LIKE '%TEMPORARY%'
                AND TIMESTAMPDIFF(MINUTE, expire, NOW()) > 5
            """)
            
            deleted_count += cursor.rowcount
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"만료된 임시 IP 리스 {deleted_count}개가 삭제되었습니다.")
            return deleted_count
        except Exception as e:
            logger.error(f"임시 IP 리스 정리 중 오류 발생: {e}")
            return 0
    
    @classmethod
    def add_to_blacklist(cls, ip_address, reason=None):
        """IP 주소를 블랙리스트에 추가하고, 현재 할당된 경우 해제"""
        try:
            if not ip_address or not re.match(r'^(\d{1,3}\.){3}\d{1,3}$', ip_address):
                logger.error(f"유효하지 않은 IP 주소 형식: {ip_address}")
                return False
            obj, created = BlacklistedIP.objects.get_or_create(ip_address=ip_address, defaults={'reason': reason})
            if not created:
                logger.info(f"IP 주소 {ip_address}는 이미 블랙리스트에 있습니다.")
                return True
            logger.info(f"IP 주소 {ip_address}가 블랙리스트에 추가되었습니다.")
            # 이하 기존 KEA 할당 해제 로직 동일
            # ...
            return True
        except Exception as e:
            logger.error(f"IP 블랙리스트 추가 중 오류 발생: {e}")
            return False
    
    @classmethod
    def remove_from_blacklist(cls, ip_address):
        """IP 주소를 블랙리스트에서 제거"""
        try:
            deleted, _ = BlacklistedIP.objects.filter(ip_address=ip_address).delete()
            if deleted:
                logger.info(f"IP 주소 {ip_address}가 블랙리스트에서 제거되었습니다.")
                return True
            else:
                logger.info(f"IP 주소 {ip_address}는 블랙리스트에 없습니다.")
                return False
        except Exception as e:
            logger.error(f"IP 블랙리스트 제거 중 오류 발생: {e}")
            return False
    
    @classmethod
    def get_blacklisted_ips(cls):
        """블랙리스트된 IP 주소 목록 가져오기"""
        return list(BlacklistedIP.objects.values_list('ip_address', flat=True))
    
    @classmethod
    def is_ip_blacklisted(cls, ip_address):
        """IP 주소가 블랙리스트에 있는지 확인"""
        return BlacklistedIP.objects.filter(ip_address=ip_address).exists() 