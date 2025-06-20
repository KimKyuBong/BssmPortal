# Generated by Django 5.1.6 on 2025-06-17 23:16

from django.db import migrations
from collections import defaultdict

def fix_macbook_and_management_number(apps, schema_editor):
    Equipment = apps.get_model('rentals', 'Equipment')

    # 1. 제조사가 Apple인 경우 equipment_type을 MACBOOK으로 변경 (for 루프 + save)
    for eq in Equipment.objects.filter(manufacturer__iexact='Apple'):
        eq.equipment_type = 'MACBOOK'
        eq.save()

    # 기존 관리번호 초기화
    Equipment.objects.all().update(management_number=None)

    # 장비 전체를 최초 등록일(created_at) 기준으로 정렬
    equipments = list(Equipment.objects.all().order_by('created_at', 'id'))

    # 연도-유형-모델별 시퀀스 관리
    seq_dict = defaultdict(int)
    model_groups = defaultdict(list)
    for equipment in equipments:
        year = (
            equipment.purchase_date.year if equipment.purchase_date else 
            equipment.manufacture_year if equipment.manufacture_year else 
            equipment.acquisition_date.year
        )
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
        ('rentals', '0012_update_apple_equipment'),
    ]

    operations = [
        migrations.RunPython(fix_macbook_and_management_number),
    ]
