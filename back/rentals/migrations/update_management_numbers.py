from django.db import migrations
from collections import defaultdict

# 장비 유형별 이니셜 매핑
EQUIPMENT_TYPE_INITIALS = {
    'NOTEBOOK': 'N',  # 일반 노트북
    'MACBOOK': 'M',  # 맥북
    'TABLET': 'T',
    'DESKTOP': 'D',
    'MONITOR': 'D',  # Display
    'PRINTER': 'P',
    'PROJECTOR': 'J',  # Projector
    'OTHER': 'O',
}

def update_management_numbers(apps, schema_editor):
    Equipment = apps.get_model('rentals', 'Equipment')
    
    # 1. 제조사가 Apple인 경우 equipment_type을 MACBOOK으로 변경
    Equipment.objects.filter(manufacturer__iexact='Apple').update(equipment_type='MACBOOK')
    
    # 기존 관리번호 초기화
    Equipment.objects.all().update(management_number=None)
    
    # 장비 전체를 최초 등록일(created_at) 기준으로 정렬
    equipments = list(Equipment.objects.all().order_by('created_at', 'id'))
    
    # 연도-유형-모델별 시퀀스 관리
    seq_dict = defaultdict(int)
    
    # 모델별로 장비 그룹화
    model_groups = defaultdict(list)
    for equipment in equipments:
        year = (
            equipment.purchase_date.year if equipment.purchase_date else 
            equipment.manufacture_year if equipment.manufacture_year else 
            equipment.acquisition_date.year
        )
        # equipment_type 값에 따라 이니셜 부여 (대소문자 구분 없이)
        etype = (equipment.equipment_type or '').upper()
        if etype == 'NOTEBOOK':
            initial = 'N'
        elif etype == 'LAPTOP':
            initial = 'L'
        elif etype == 'MACBOOK':
            initial = 'M'
        elif etype == 'TABLET':
            initial = 'T'
        elif etype == 'DESKTOP':
            initial = 'D'
        elif etype == 'MONITOR':
            initial = 'D'
        elif etype == 'PRINTER':
            initial = 'P'
        elif etype == 'PROJECTOR':
            initial = 'J'
        else:
            initial = 'O'
        key = f"{initial}-{year}-{equipment.model_name}"
        model_groups[key].append(equipment)
    
    # 각 모델 그룹별로 시퀀스 부여
    for key, group in model_groups.items():
        initial, year, _ = key.split('-', 2)
        base_sequence = seq_dict[f"{initial}-{year}"]
        
        for equipment in group:
            base_sequence += 1
            equipment.management_number = f"{initial}-{year}-{base_sequence:03d}"
            equipment.save()
        
        seq_dict[f"{initial}-{year}"] = base_sequence

class Migration(migrations.Migration):
    dependencies = [
        ('rentals', '0001_initial'),  # 이전 마이그레이션에 맞게 수정 필요
    ]

    operations = [
        migrations.RunPython(update_management_numbers),
    ] 