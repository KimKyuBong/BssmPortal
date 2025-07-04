# Generated by Django 5.1.6 on 2025-06-17 23:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0009_merge_20250618_0758'),
    ]

    operations = [
        migrations.AlterField(
            model_name='equipment',
            name='equipment_type',
            field=models.CharField(choices=[('NOTEBOOK', '노트북'), ('MACBOOK', '맥북'), ('TABLET', '태블릿'), ('DESKTOP', '데스크톱'), ('MONITOR', '모니터'), ('PRINTER', '프린터'), ('PROJECTOR', '프로젝터'), ('OTHER', '기타')], max_length=20, verbose_name='장비 유형'),
        ),
    ]
