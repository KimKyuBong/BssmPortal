#!/usr/bin/env python3
import subprocess
import re
import json
import requests
import uuid
import platform
import os

def get_system_info():
    """시스템 정보를 수집합니다."""
    info = {
        "manufacturer": "",
        "model_name": "",
        "serial_number": "",
        "mac_addresses": []
    }
    
    # 제조사 및 모델명 수집
    if platform.system() == "Linux":
        try:
            with open('/sys/devices/virtual/dmi/id/product_name', 'r') as f:
                info["model_name"] = f.read().strip()
            with open('/sys/devices/virtual/dmi/id/sys_vendor', 'r') as f:
                info["manufacturer"] = f.read().strip()
            with open('/sys/devices/virtual/dmi/id/product_serial', 'r') as f:
                info["serial_number"] = f.read().strip()
        except:
            pass
    
    # MAC 주소 수집
    try:
        if platform.system() == "Linux":
            # 네트워크 인터페이스 목록 가져오기
            interfaces = subprocess.check_output(['ip', 'link', 'show']).decode()
            for line in interfaces.split('\n'):
                if 'link/ether' in line:
                    mac = re.search(r'link/ether\s+([0-9a-f:]+)', line)
                    if mac:
                        interface = re.search(r'^\d+:\s+([^:]+):', line)
                        if interface:
                            interface_name = interface.group(1)
                            interface_type = "ETHERNET" if "eth" in interface_name else "WIFI" if "wlan" in interface_name else "OTHER"
                            info["mac_addresses"].append({
                                "mac_address": mac.group(1),
                                "interface_type": interface_type,
                                "is_primary": interface_type == "ETHERNET"  # 이더넷을 기본으로 설정
                            })
    except:
        pass
    
    return info

def register_device(api_url, device_info):
    """장치를 서버에 등록합니다."""
    try:
        response = requests.post(f"{api_url}/equipment/register/", json=device_info)
        if response.status_code == 201:
            print("장치가 성공적으로 등록되었습니다.")
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print(f"장치 등록 실패: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"장치 등록 중 오류 발생: {str(e)}")

if __name__ == "__main__":
    # API 서버 URL 설정
    API_URL = "http://your-api-server/api"
    
    # 시스템 정보 수집
    device_info = get_system_info()
    
    # 기본값 설정
    if not device_info["manufacturer"]:
        device_info["manufacturer"] = "Unknown"
    if not device_info["model_name"]:
        device_info["model_name"] = platform.node()
    if not device_info["serial_number"]:
        device_info["serial_number"] = str(uuid.uuid4())
    
    # 장비 정보 설정
    device_info.update({
        "name": f"{device_info['manufacturer']} {device_info['model_name']}",
        "equipment_type": "LAPTOP" if "laptop" in device_info["model_name"].lower() else "DESKTOP",
        "description": f"자동 등록된 {platform.system()} 기기",
        "status": "AVAILABLE",
        "acquisition_date": "2024-01-01"  # 실제 등록 날짜로 변경 필요
    })
    
    # 장치 등록
    register_device(API_URL, device_info) 