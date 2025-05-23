# Generated by Django 5.1.6 on 2025-04-10 03:46

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0003_remove_equipment_item_number_remove_rental_device_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='equipment',
            options={'ordering': ['-created_at'], 'verbose_name': '장비', 'verbose_name_plural': '장비'},
        ),
        migrations.AddField(
            model_name='equipment',
            name='manufacturer',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='제조사'),
        ),
        migrations.AddField(
            model_name='equipment',
            name='model_name',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='모델명'),
        ),
        migrations.AlterField(
            model_name='equipment',
            name='acquisition_date',
            field=models.DateField(default=django.utils.timezone.now, verbose_name='취득일'),
        ),
        migrations.AlterField(
            model_name='equipment',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='등록일'),
        ),
        migrations.AlterField(
            model_name='equipment',
            name='equipment_type',
            field=models.CharField(choices=[('LAPTOP', '노트북'), ('DESKTOP', '데스크톱'), ('MONITOR', '모니터'), ('KEYBOARD', '키보드'), ('MOUSE', '마우스'), ('PRINTER', '프린터'), ('PROJECTOR', '프로젝터'), ('OTHER', '기타')], max_length=20, verbose_name='장비 유형'),
        ),
        migrations.AlterField(
            model_name='equipment',
            name='serial_number',
            field=models.CharField(max_length=100, unique=True, verbose_name='시리얼 번호'),
        ),
        migrations.AlterField(
            model_name='equipment',
            name='status',
            field=models.CharField(choices=[('AVAILABLE', '사용 가능'), ('RENTED', '대여 중'), ('MAINTENANCE', '점검 중'), ('BROKEN', '고장'), ('LOST', '분실'), ('DISPOSED', '폐기')], default='AVAILABLE', max_length=20, verbose_name='상태'),
        ),
        migrations.CreateModel(
            name='EquipmentMacAddress',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mac_address', models.CharField(max_length=17, verbose_name='MAC 주소')),
                ('interface_type', models.CharField(choices=[('ETHERNET', '이더넷'), ('WIFI', '와이파이'), ('OTHER', '기타')], max_length=20, verbose_name='인터페이스 종류')),
                ('is_primary', models.BooleanField(default=False, verbose_name='기본 MAC 주소')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='생성일')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='수정일')),
                ('equipment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mac_addresses', to='rentals.equipment', verbose_name='장비')),
            ],
            options={
                'verbose_name': '장비 MAC 주소',
                'verbose_name_plural': '장비 MAC 주소들',
                'unique_together': {('equipment', 'mac_address')},
            },
        ),
    ]
