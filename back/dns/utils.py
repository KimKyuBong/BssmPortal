import os
import toml
import re
import asyncio
import json
import requests
from typing import List, Tuple
from .models import CustomDnsRecord
import idna

# EXTERNAL_PIHOLE_API 환경변수에서 주소를 받아 ws://[주소]:8000/ws/pihole/ 형태로 사용
API_HOST = os.environ.get("EXTERNAL_PIHOLE_API", "localhost")
# 기존 TOML 경로 (백업용)
TOML_PATH = "/etc/pihole/pihole.toml"

# Pi-hole API endpoint (FastAPI)
PIHOLE_API_SYNC = f"http://{API_HOST}/api/sync"

# 한글 도메인을 punycode로 변환
def to_punycode(domain: str) -> str:
    """한글 도메인을 punycode로 변환"""
    try:
        return idna.encode(domain, uts46=True).decode('ascii')
    except Exception:
        return domain

# punycode를 한글로 역변환
def from_punycode(domain: str) -> str:
    """punycode를 한글 도메인으로 변환"""
    try:
        return idna.decode(domain, uts46=True)
    except Exception:
        return domain

# 도메인 유효성 검증
def validate_domain(domain: str) -> tuple[bool, str]:
    """
    도메인 유효성 검증
    Returns: (is_valid, error_message)
    """
    if not domain:
        return False, "도메인을 입력해주세요."
    
    # 공백 제거
    domain = domain.strip()
    
    # 길이 검증 (전체 도메인은 253자 이하)
    if len(domain) > 253:
        return False, "도메인이 너무 깁니다. (최대 253자)"
    
    # 기본 형식 검증 (점으로 시작하거나 끝나면 안됨)
    if domain.startswith('.') or domain.endswith('.'):
        return False, "도메인은 점(.)으로 시작하거나 끝날 수 없습니다."
    
    # 연속된 점 검증
    if '..' in domain:
        return False, "도메인에 연속된 점(..)이 있으면 안됩니다."
    
    # 도메인 구성 요소 분리
    parts = domain.split('.')
    
    # 최소 2개 부분 필요 (예: example.com)
    if len(parts) < 2:
        return False, "올바른 도메인 형식이 아닙니다. (예: example.com, 사이트.kr, 도메인.한국)"
    
    # 각 부분 검증
    for part in parts:
        if not part:
            return False, "도메인 구성 요소가 비어있습니다."
        
        # 길이 검증 (각 라벨은 63자 이하)
        if len(part) > 63:
            return False, f"도메인 구성 요소가 너무 깁니다: '{part}' (최대 63자)"
        
        # 하이픈으로 시작하거나 끝나면 안됨
        if part.startswith('-') or part.endswith('-'):
            return False, f"도메인 구성 요소는 하이픈(-)으로 시작하거나 끝날 수 없습니다: '{part}'"
    
    # TLD 검증 (마지막 부분)
    tld = parts[-1].lower()
    
    # 유효한 TLD 목록 (일반적인 것들 + 한국 관련)
    valid_tlds = {
        # 일반 TLD
        'com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro',
        # 국가별 TLD
        'kr', 'us', 'uk', 'jp', 'cn', 'de', 'fr', 'ca', 'au', 'in', 'br', 'ru',
        # 새로운 TLD
        'app', 'dev', 'io', 'ai', 'tech', 'online', 'site', 'website', 'store', 'blog',
        # 한국어 TLD
        '한국', 'xn--3e0b707e'  # 한국의 punycode
    }
    
    # TLD가 숫자로만 이루어져 있으면 안됨
    if tld.isdigit():
        return False, "도메인 확장자는 숫자로만 이루어질 수 없습니다."
    
    # punycode로 변환된 한글 TLD도 확인
    try:
        tld_punycode = tld.encode('idna').decode('ascii')
        if tld_punycode not in valid_tlds and tld not in valid_tlds:
            # 일반적인 패턴 확인 (2-4자의 알파벳 또는 한글)
            if not re.match(r'^[a-zA-Z가-힣]{2,4}$', tld) and not re.match(r'^xn--[a-z0-9]+$', tld):
                return False, f"지원하지 않는 도메인 확장자입니다: '.{tld}'\n지원 형식: .com, .net, .kr, .한국, .info 등"
    except:
        return False, f"올바르지 않은 도메인 확장자입니다: '.{tld}'"
    
    return True, ""

# 정보포털.com 기본값 보장
def ensure_default_dns_record():
    default_domain = to_punycode('정보포털.com')
    default_ip = '10.129.55.253'
    CustomDnsRecord.objects.update_or_create(domain=default_domain, defaults={'ip': default_ip})

# 외부 Pi-hole 서비스 연결 확인
def check_external_service():
    """외부 Pi-hole 서비스 연결 상태 확인"""
    try:
        response = requests.get(f"{API_HOST}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

# 도메인 추가 (HTTP)
def add_domain_via_api(domain: str, ip: str) -> dict:
    try:
        url = f"{PIHOLE_API_SYNC}/add_domain"
        payload = {"domain": domain, "ip": ip}
        resp = requests.post(url, json=payload, timeout=5)
        return resp.json() if resp.ok else {"success": False, "message": resp.text}
    except Exception as e:
        print(f"API 오류: {e}")
        return {"success": False, "message": f"API 연결 실패: {str(e)}"}

# 도메인 제거 (HTTP)
def remove_domain_via_api(domain: str) -> dict:
    try:
        url = f"{PIHOLE_API_SYNC}/remove_domain"
        payload = {"domain": domain}
        resp = requests.post(url, json=payload, timeout=5)
        return resp.json() if resp.ok else {"success": False, "message": resp.text}
    except Exception as e:
        print(f"API 오류: {e}")
        return {"success": False, "message": f"API 연결 실패: {str(e)}"}

# Pi-hole 상태 조회 (HTTP)
def get_pihole_status_via_api() -> dict:
    try:
        url = f"{PIHOLE_API_SYNC}/status"
        resp = requests.get(url, timeout=5)
        return resp.json() if resp.ok else {"status": "error", "message": resp.text}
    except Exception as e:
        print(f"API 오류: {e}")
        return {"status": "error", "message": f"API 연결 실패: {str(e)}"}

# 기존 TOML 방식 (백업용)
def read_custom_list() -> List[Tuple[str, str]]:
    """기존 TOML 파일 읽기 (백업용)"""
    records = []
    try:
        with open(TOML_PATH, 'r', encoding='utf-8') as f:
            data = toml.load(f)
        hosts = data.get('dns', {}).get('hosts', [])
        for entry in hosts:
            ip, domain = entry.split(' ', 1)
            records.append((domain, ip))
    except Exception as e:
        print(f"Error reading toml: {e}")
    return records

def write_custom_list(records: List[Tuple[str, str]]) -> bool:
    """기존 TOML 파일 쓰기 (백업용)"""
    try:
        with open(TOML_PATH, 'r', encoding='utf-8') as f:
            data = toml.load(f)
        data.setdefault('dns', {})['hosts'] = [f"{ip} {domain}" for domain, ip in records]
        with open(TOML_PATH, 'w', encoding='utf-8') as f:
            toml.dump(data, f)
        return True
    except Exception as e:
        print(f"Error writing toml: {e}")
        return False

# 새로운 WebSocket 기반 도메인 추가
def add_domain_to_custom_list(domain: str, ip: str) -> bool:
    domain = to_punycode(domain)
    records = read_custom_list()
    for existing_domain, _ in records:
        if existing_domain == domain:
            return False
    records.append((domain, ip))
    return write_custom_list(records)

# 새로운 WebSocket 기반 도메인 제거
def remove_domain_from_custom_list(domain: str) -> bool:
    domain = to_punycode(domain)
    records = read_custom_list()
    original_count = len(records)
    records = [(d, ip) for d, ip in records if d != domain]
    if len(records) == original_count:
        return False
    return write_custom_list(records)

# DB의 CustomDnsRecord 전체를 외부 서비스에 반영
def apply_dns_records():
    ensure_default_dns_record()
    from .models import CustomDnsRecord
    records = CustomDnsRecord.objects.all()
    record_list = [{"domain": rec.domain, "ip": rec.ip} for rec in records]
    print("[동기화 요청] FastAPI로 보낼 레코드 목록:")
    for rec in record_list:
        print(f"  - {rec['domain']} -> {rec['ip']}")
    try:
        resp = requests.post(PIHOLE_API_SYNC, json={"records": record_list}, timeout=10)
        if resp.ok:
            return resp.json()
        else:
            return {'result': f'Pi-hole API 동기화 실패: {resp.text}'}
    except Exception as e:
        print(f"Pi-hole API 동기화 오류: {e}")
        return {'result': f'Pi-hole API 동기화 오류: {str(e)}'}

# Pi-hole 상태 조회
def get_pihole_status():
    if not check_external_service():
        return {"status": "offline", "message": "외부 Pi-hole 서비스에 연결할 수 없습니다."}
    try:
        status = get_pihole_status_via_api()
        return status
    except Exception as e:
        return {"status": "error", "message": f"상태 조회 실패: {str(e)}"}

def get_dns_info_for_device(device):
    """디바이스에 대한 DNS 정보를 반환"""
    if not device.assigned_ip:
        return {'status': 'none'}
        
    # DNS 모델들을 임포트
    from .models import CustomDnsRecord, CustomDnsRequest
    
    # 승인된 도메인 확인
    try:
        record = CustomDnsRecord.objects.get(ip=device.assigned_ip)
        return {
            'status': 'approved',
            'domain': from_punycode(record.domain),
            'record_id': record.id
        }
    except CustomDnsRecord.DoesNotExist:
        pass
        
    # 요청 상태 확인 (최신 순으로 정렬하여 가장 최근 요청 확인)
    try:
        latest_request = CustomDnsRequest.objects.filter(
            ip=device.assigned_ip,
            user=device.user
        ).order_by('-created_at').first()
        
        if latest_request:
            return {
                'status': latest_request.status,
                'domain': from_punycode(latest_request.domain),
                'request_id': latest_request.id,
                'reject_reason': latest_request.reject_reason if latest_request.status == 'rejected' else None,
                'created_at': latest_request.created_at.isoformat() if latest_request.created_at else None
            }
    except Exception:
        pass
        
    return {'status': 'none'} 