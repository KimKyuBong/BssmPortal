# Generated by Django 5.1.6 on 2025-04-17 10:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rentals', '0005_alter_equipment_equipment_type'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='rentalrequest',
            name='reason',
        ),
        migrations.AddField(
            model_name='rentalrequest',
            name='reject_reason',
            field=models.TextField(blank=True, verbose_name='거절 사유'),
        ),
        migrations.AddField(
            model_name='rentalrequest',
            name='request_reason',
            field=models.TextField(blank=True, verbose_name='신청 사유'),
        ),
    ]
