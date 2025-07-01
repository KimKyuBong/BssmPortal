#!/usr/bin/env python
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bssmcaptive.settings')
django.setup()

from broadcast.models import BroadcastHistory, BroadcastPreview
from django.utils import timezone
import uuid
import datetime

def connect_existing_history():
    """기존 방송 이력에 프리뷰를 연결하는 함수"""
    print("기존 방송 이력에 프리뷰 연결 시작...")
    
    # 프리뷰가 연결되지 않은 방송 이력 조회
    histories_without_preview = BroadcastHistory.objects.filter(preview__isnull=True)
    print(f"프리뷰가 연결되지 않은 방송 이력 수: {histories_without_preview.count()}")
    
    for history in histories_without_preview:
        print(f"방송 이력 ID {history.id} 처리 중...")
        
        # 프리뷰 ID 생성
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        preview_id = f"preview_{timestamp}_{unique_id}"
        
        # 프리뷰 생성
        preview = BroadcastPreview.objects.create(
            preview_id=preview_id,
            broadcast_type=history.broadcast_type,
            content=history.content,
            target_rooms=history.target_rooms,
            language=history.language,
            auto_off=history.auto_off,
            status='approved',  # 이미 완료된 방송이므로 승인됨으로 설정
            created_by=history.broadcasted_by,
            approved_by=history.broadcasted_by,
            created_at=history.created_at,
            approved_at=history.completed_at or history.created_at,
            expires_at=history.created_at + datetime.timedelta(hours=1)
        )
        
        # 방송 이력에 프리뷰 연결
        history.preview = preview
        history.save()
        
        print(f"  - 프리뷰 {preview_id} 생성 및 연결 완료")
    
    print("기존 방송 이력 프리뷰 연결 완료!")

if __name__ == '__main__':
    connect_existing_history() 