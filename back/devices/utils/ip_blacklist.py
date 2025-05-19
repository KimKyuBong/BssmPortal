import os
import json
import logging
from pathlib import Path
from django.conf import settings

logger = logging.getLogger(__name__)

class IPBlacklist:
    """
    IP 블랙리스트를 관리하는 클래스
    블랙리스트된 IP 주소는 KEA DHCP 서버에서 할당되지 않도록 합니다.
    """
    
    _instance = None
    _blacklist_file = None
    _blacklist = set()
    
    def __new__(cls):
        """
        싱글톤 패턴 구현 - 하나의 인스턴스만 생성되도록 함
        """
        if cls._instance is None:
            cls._instance = super(IPBlacklist, cls).__new__(cls)
            cls._instance._init_blacklist()
        return cls._instance
    
    def _init_blacklist(self):
        """
        블랙리스트 파일을 초기화하고 로드합니다.
        """
        # 파일 경로 설정 (DATA_DIR 사용 또는 기본 위치 지정)
        data_dir = getattr(settings, 'DATA_DIR', None)
        
        if data_dir:
            base_dir = Path(data_dir)
        else:
            base_dir = Path(settings.BASE_DIR) / 'data'
            
        # 디렉토리가 없으면 생성
        if not base_dir.exists():
            os.makedirs(base_dir, exist_ok=True)
            
        self._blacklist_file = base_dir / 'ip_blacklist.json'
        self._load_blacklist()
    
    def _load_blacklist(self):
        """
        블랙리스트 파일에서 IP 주소 목록을 로드합니다.
        """
        if self._blacklist_file.exists():
            try:
                with open(self._blacklist_file, 'r') as f:
                    data = json.load(f)
                    self._blacklist = set(data.get('blacklisted_ips', []))
                logger.info(f"IP 블랙리스트 로드 완료: {len(self._blacklist)}개 IP 주소")
            except Exception as e:
                logger.error(f"IP 블랙리스트 로드 중 오류 발생: {e}")
                self._blacklist = set()
        else:
            # 초기 파일 생성
            self._blacklist = set()
            self._save_blacklist()
            logger.info("새로운 IP 블랙리스트 파일 생성됨")
    
    def _save_blacklist(self):
        """
        블랙리스트를 파일에 저장합니다.
        """
        try:
            with open(self._blacklist_file, 'w') as f:
                json.dump({
                    'blacklisted_ips': list(self._blacklist)
                }, f, indent=2, ensure_ascii=False)
            logger.info(f"IP 블랙리스트 저장 완료: {len(self._blacklist)}개 IP 주소")
            return True
        except Exception as e:
            logger.error(f"IP 블랙리스트 저장 중 오류 발생: {e}")
            return False
    
    def add_ip(self, ip_address):
        """
        IP 주소를 블랙리스트에 추가합니다.
        
        Args:
            ip_address (str): 블랙리스트에 추가할 IP 주소
            
        Returns:
            bool: 추가 성공 여부
        """
        if not ip_address or not isinstance(ip_address, str):
            logger.error(f"유효하지 않은 IP 주소 형식: {ip_address}")
            return False
            
        # IP 주소가 이미 블랙리스트에 있는지 확인
        if ip_address in self._blacklist:
            logger.info(f"IP 주소 {ip_address}는 이미 블랙리스트에 있습니다.")
            return True
            
        # 블랙리스트에 추가
        self._blacklist.add(ip_address)
        success = self._save_blacklist()
        
        if success:
            logger.info(f"IP 주소 {ip_address}가 블랙리스트에 추가되었습니다.")
        
        return success
    
    def remove_ip(self, ip_address):
        """
        IP 주소를 블랙리스트에서 제거합니다.
        
        Args:
            ip_address (str): 블랙리스트에서 제거할 IP 주소
            
        Returns:
            bool: 제거 성공 여부
        """
        if not ip_address or ip_address not in self._blacklist:
            logger.info(f"IP 주소 {ip_address}는 블랙리스트에 없습니다.")
            return False
            
        # 블랙리스트에서 제거
        self._blacklist.remove(ip_address)
        success = self._save_blacklist()
        
        if success:
            logger.info(f"IP 주소 {ip_address}가 블랙리스트에서 제거되었습니다.")
        
        return success
    
    def is_blacklisted(self, ip_address):
        """
        IP 주소가 블랙리스트에 있는지 확인합니다.
        
        Args:
            ip_address (str): 확인할 IP 주소
            
        Returns:
            bool: 블랙리스트에 있으면 True, 없으면 False
        """
        return ip_address in self._blacklist
    
    def get_all_blacklisted_ips(self):
        """
        모든 블랙리스트된 IP 주소 목록을 반환합니다.
        
        Returns:
            list: 블랙리스트된 IP 주소 목록
        """
        return list(self._blacklist)
    
    def clear_blacklist(self):
        """
        블랙리스트를 모두 비웁니다.
        
        Returns:
            bool: 성공 여부
        """
        self._blacklist.clear()
        success = self._save_blacklist()
        
        if success:
            logger.info("IP 블랙리스트가 모두 비워졌습니다.")
        
        return success


# 싱글톤 인스턴스를 쉽게 사용할 수 있도록 함수 제공
def get_ip_blacklist():
    """
    IP 블랙리스트 인스턴스를 가져옵니다.
    
    Returns:
        IPBlacklist: 블랙리스트 인스턴스
    """
    return IPBlacklist() 