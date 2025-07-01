#!/usr/bin/env python3
"""
기존 CA 인증서에 OCSP URL을 포함하도록 재생성하는 스크립트
"""

import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from dns.models import CertificateAuthority
from dns.ssl_utils import CertificateManager
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def update_ca_with_ocsp():
    """기존 CA 인증서에 OCSP URL을 포함하도록 재생성"""
    try:
        # 기존 CA 확인
        existing_ca = CertificateAuthority.objects.filter(is_active=True).first()
        if not existing_ca:
            print("활성 CA가 없습니다. 새로 생성합니다.")
            manager = CertificateManager()
            ca, created = manager.create_ca()
            print(f"새 CA 생성 완료: {ca.name}")
            return
        
        print(f"기존 CA 발견: {existing_ca.name}")
        
        # CA 재생성 (OCSP URL 포함)
        manager = CertificateManager()
        
        # 기존 CA 비활성화
        existing_ca.is_active = False
        existing_ca.save()
        print("기존 CA 비활성화 완료")
        
        # 새 CA 생성 (OCSP URL 포함)
        new_ca, created = manager.create_ca()
        print(f"새 CA 생성 완료: {new_ca.name}")
        
        # 기존 CA 삭제 (선택사항)
        # existing_ca.delete()
        # print("기존 CA 삭제 완료")
        
        print("CA 업데이트 완료!")
        print(f"새 CA 이름: {new_ca.name}")
        print(f"OCSP URL: {getattr(settings, 'OCSP_URL', 'Not set')}")
        
    except Exception as e:
        print(f"CA 업데이트 실패: {e}")
        logger.error(f"CA 업데이트 실패: {e}")

if __name__ == "__main__":
    update_ca_with_ocsp() 