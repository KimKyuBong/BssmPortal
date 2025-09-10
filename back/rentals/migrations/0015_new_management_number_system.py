from django.db import migrations, models
from django.utils import timezone
from collections import defaultdict

def migrate_management_numbers(apps, schema_editor):
    """
    기존 관리번호를 새로운 체계로 마이그레이션
    """
    Equipment = apps.get_model('rentals', 'Equipment')
    EquipmentModel = apps.get_model('rentals', 'EquipmentModel')
    
    # 기존 관리번호가 있는 장비들만 처리
    equipments = Equipment.objects.filter(
        management_number__isnull=False
    ).exclude(management_number='')
    
    # 연도별, 카테고리별, 모델별로 그룹화
    model_groups = defaultdict(list)
    
    for equipment in equipments:
        if not equipment.purchase_date or not equipment.model_name:
            continue
            
        year = equipment.purchase_date.year
        key = (equipment.equipment_type, year, equipment.model_name)
        model_groups[key].append(equipment)
    
    # 각 그룹별로 모델 번호 할당
    for (equipment_type, year, model_name), group in model_groups.items():
        # EquipmentModel 테이블에 모델 정보 생성
        model_number = len(model_groups) + 1  # 임시 번호
        
        # 실제로는 해당 연도, 카테고리의 최대 번호 + 1
        existing_models = EquipmentModel.objects.filter(
            equipment_type=equipment_type,
            year=year
        )
        max_number = existing_models.aggregate(
            models.Max('model_number')
        )['model_number__max'] or 0
        model_number = max_number + 1
        
        # EquipmentModel 레코드 생성
        EquipmentModel.objects.create(
            equipment_type=equipment_type,
            year=year,
            model_name=model_name,
            model_number=model_number
        )
        
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
        new_management_number = f"{initial}-{year}-{model_name}-{model_number:03d}"
        
        for equipment in group:
            equipment.management_number = new_management_number
            equipment.save()

def reverse_migrate_management_numbers(apps, schema_editor):
    """
    마이그레이션 되돌리기 (필요시)
    """
    EquipmentModel = apps.get_model('rentals', 'EquipmentModel')
    EquipmentModel.objects.all().delete()

class Migration(migrations.Migration):
    dependencies = [
        ('rentals', '0014_alter_equipment_equipment_type'),
    ]

    operations = [
        # EquipmentModel 테이블 생성
        migrations.CreateModel(
            name='EquipmentModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('equipment_type', models.CharField(choices=[('LAPTOP', '노트북'), ('MACBOOK', '맥북'), ('TABLET', '태블릿'), ('DESKTOP', '데스크톱'), ('MONITOR', '모니터'), ('PRINTER', '프린터'), ('PROJECTOR', '프로젝터'), ('OTHER', '기타')], max_length=20, verbose_name='장비 유형')),
                ('year', models.IntegerField(verbose_name='연도')),
                ('model_name', models.CharField(max_length=100, verbose_name='모델명')),
                ('model_number', models.IntegerField(verbose_name='모델 번호')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='생성일')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='수정일')),
            ],
            options={
                'verbose_name': '장비 모델',
                'verbose_name_plural': '장비 모델들',
                'ordering': ['equipment_type', 'year', 'model_number'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='equipmentmodel',
            unique_together={('equipment_type', 'year', 'model_name')},
        ),
        # 데이터 마이그레이션
        migrations.RunPython(
            migrate_management_numbers,
            reverse_migrate_management_numbers
        ),
    ] 