#!/usr/bin/env python
"""
도커 환경에서 관리번호 마이그레이션을 안전하게 실행하는 스크립트
"""
import os
import sys
import django
from django.conf import settings

# Django 설정
import sys
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rentals.models import Equipment, EquipmentModel
from django.db.models import Max, Count
from collections import defaultdict

def backup_existing_numbers():
    """기존 관리번호 백업"""
    print("기존 관리번호 백업 중...")
    backup_data = []
    
    for equipment in Equipment.objects.filter(management_number__isnull=False):
        backup_data.append({
            'id': equipment.id,
            'old_number': equipment.management_number,
            'asset_number': equipment.asset_number,
            'model_name': equipment.model_name,
            'equipment_type': equipment.equipment_type,
            'purchase_date': equipment.purchase_date
        })
    
    print(f"백업 완료: {len(backup_data)}개 장비")
    return backup_data

def migrate_to_new_system():
    """새로운 관리번호 체계로 마이그레이션"""
    print("새로운 관리번호 체계로 마이그레이션 시작...")
    
    # 기존 관리번호가 있는 장비들만 처리
    equipments = Equipment.objects.filter(
        management_number__isnull=False
    ).exclude(management_number='')
    
    print(f"처리할 장비 수: {equipments.count()}")
    
    # 연도별, 카테고리별, 모델별로 그룹화
    model_groups = defaultdict(list)
    
    for equipment in equipments:
        if not equipment.purchase_date or not equipment.model_name:
            print(f"건너뛰기: 장비 {equipment.id} (구매일 또는 모델명 없음)")
            continue
            
        year = equipment.purchase_date.year
        key = (equipment.equipment_type, year, equipment.model_name)
        model_groups[key].append(equipment)
    
    print(f"모델 그룹 수: {len(model_groups)}")
    
    # 각 그룹별로 모델 번호 할당
    for (equipment_type, year, model_name), group in model_groups.items():
        print(f"처리 중: {equipment_type}-{year}-{model_name} ({len(group)}개)")
        
        # EquipmentModel 테이블에서 기존 모델 번호 확인
        try:
            existing_model = EquipmentModel.objects.get(
                equipment_type=equipment_type,
                year=year,
                model_name=model_name
            )
            model_number = existing_model.model_number
            print(f"  기존 모델 번호 사용: {model_number}")
        except EquipmentModel.DoesNotExist:
            # 해당 연도, 카테고리의 최대 번호 + 1
            existing_models = EquipmentModel.objects.filter(
                equipment_type=equipment_type,
                year=year
            )
            max_number = existing_models.aggregate(
                Max('model_number')
            )['model_number__max'] or 0
            model_number = max_number + 1
            
            # EquipmentModel 레코드 생성
            EquipmentModel.objects.create(
                equipment_type=equipment_type,
                year=year,
                model_name=model_name,
                model_number=model_number
            )
            print(f"  새 모델 번호 생성: {model_number}")
        
        # 각 장비의 관리번호 업데이트
        # 장비 유형별 이니셜 매핑
        equipment_type_initials = {
            'LAPTOP': 'L',  # 노트북
            'MACBOOK': 'M',  # 맥북
            'TABLET': 'T',
            'DESKTOP': 'D',
            'MONITOR': 'D',  # Display
            'PRINTER': 'P',
            'PROJECTOR': 'J',  # Projector
            'OTHER': 'O',
        }
        initial = equipment_type_initials.get(equipment_type, 'O')
        
        for i, equipment in enumerate(group, 1):
            old_number = equipment.management_number
            # 각 장비별로 고유한 번호 부여 (모델번호-제품순번)
            new_management_number = f"{initial}-{year}-{model_number:03d}-{i:02d}"
            equipment.management_number = new_management_number
            equipment.save()
            print(f"    {old_number} -> {new_management_number}")
    
    print("마이그레이션 완료!")

def verify_migration():
    """마이그레이션 결과 검증"""
    print("마이그레이션 결과 검증 중...")
    
    # 새로운 체계의 관리번호 확인
    new_format_count = Equipment.objects.filter(
        management_number__regex=r'^[A-Z]-\d{4}-.+-\d{3}$'
    ).count()
    
    # 기존 체계의 관리번호 확인
    old_format_count = Equipment.objects.filter(
        management_number__regex=r'^[A-Z]-\d{4}-\d{3}$'
    ).count()
    
    total_with_number = Equipment.objects.filter(
        management_number__isnull=False
    ).exclude(management_number='').count()
    
    print(f"새로운 체계: {new_format_count}개")
    print(f"기존 체계: {old_format_count}개")
    print(f"총 관리번호 있음: {total_with_number}개")
    
    # EquipmentModel 테이블 확인
    model_count = EquipmentModel.objects.count()
    print(f"EquipmentModel 레코드: {model_count}개")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='관리번호 마이그레이션 스크립트')
    parser.add_argument('--backup', action='store_true', help='기존 관리번호 백업')
    parser.add_argument('--migrate', action='store_true', help='새로운 체계로 마이그레이션')
    parser.add_argument('--verify', action='store_true', help='마이그레이션 결과 검증')
    parser.add_argument('--all', action='store_true', help='모든 작업 실행')
    
    args = parser.parse_args()
    
    if args.all or args.backup:
        backup_data = backup_existing_numbers()
        # 백업 데이터를 파일로 저장
        import json
        with open('management_number_backup.json', 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)
        print("백업 파일 저장: management_number_backup.json")
    
    if args.all or args.migrate:
        migrate_to_new_system()
    
    if args.all or args.verify:
        verify_migration()
    
    if not any([args.backup, args.migrate, args.verify, args.all]):
        print("사용법:")
        print("  python migrate_management_numbers.py --backup  # 백업만")
        print("  python migrate_management_numbers.py --migrate  # 마이그레이션만")
        print("  python migrate_management_numbers.py --verify   # 검증만")
        print("  python migrate_management_numbers.py --all      # 모든 작업") 