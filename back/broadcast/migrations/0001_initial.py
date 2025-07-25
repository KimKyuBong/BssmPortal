# Generated by Django 5.1.6 on 2025-06-28 06:19

import broadcast.models
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DeviceMatrix',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('device_name', models.CharField(max_length=100, verbose_name='장치명')),
                ('room_id', models.IntegerField(unique=True, verbose_name='방 번호')),
                ('position_row', models.IntegerField(verbose_name='행 위치')),
                ('position_col', models.IntegerField(verbose_name='열 위치')),
                ('matrix_row', models.IntegerField(verbose_name='매트릭스 행')),
                ('matrix_col', models.IntegerField(verbose_name='매트릭스 열')),
                ('is_active', models.BooleanField(default=True, verbose_name='활성화 상태')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='생성일')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='수정일')),
            ],
            options={
                'verbose_name': '장치 매트릭스',
                'verbose_name_plural': '장치 매트릭스',
                'db_table': 'broadcast_device_matrix',
                'ordering': ['matrix_row', 'matrix_col'],
            },
        ),
        migrations.CreateModel(
            name='AudioFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to=broadcast.models.AudioFile.audio_upload_path, validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['mp3', 'wav', 'ogg', 'm4a'])], verbose_name='오디오 파일')),
                ('original_filename', models.CharField(max_length=255, verbose_name='원본 파일명')),
                ('file_size', models.BigIntegerField(verbose_name='파일 크기 (bytes)')),
                ('duration', models.FloatField(blank=True, null=True, verbose_name='재생 시간 (초)')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='업로드일')),
                ('is_active', models.BooleanField(default=True, verbose_name='활성화 상태')),
                ('uploaded_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='업로드자')),
            ],
            options={
                'verbose_name': '오디오 파일',
                'verbose_name_plural': '오디오 파일',
                'db_table': 'broadcast_audio_files',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='BroadcastHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('broadcast_type', models.CharField(choices=[('text', '텍스트 방송'), ('audio', '음성 방송')], max_length=10, verbose_name='방송 타입')),
                ('content', models.TextField(verbose_name='방송 내용')),
                ('target_rooms', models.JSONField(default=list, verbose_name='대상 방 목록')),
                ('language', models.CharField(default='ko', max_length=5, verbose_name='언어')),
                ('auto_off', models.BooleanField(default=False, verbose_name='자동 끄기')),
                ('status', models.CharField(choices=[('pending', '대기중'), ('broadcasting', '방송중'), ('completed', '완료'), ('failed', '실패')], default='pending', max_length=20, verbose_name='상태')),
                ('error_message', models.TextField(blank=True, null=True, verbose_name='오류 메시지')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='생성일')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='완료일')),
                ('broadcasted_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='방송자')),
            ],
            options={
                'verbose_name': '방송 이력',
                'verbose_name_plural': '방송 이력',
                'db_table': 'broadcast_history',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='BroadcastSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200, verbose_name='방송 제목')),
                ('broadcast_type', models.CharField(choices=[('text', '텍스트 방송'), ('audio', '음성 방송')], max_length=10, verbose_name='방송 타입')),
                ('content', models.TextField(verbose_name='방송 내용')),
                ('target_rooms', models.JSONField(default=list, verbose_name='대상 방 목록')),
                ('language', models.CharField(default='ko', max_length=5, verbose_name='언어')),
                ('auto_off', models.BooleanField(default=False, verbose_name='자동 끄기')),
                ('scheduled_at', models.DateTimeField(verbose_name='예약 시간')),
                ('status', models.CharField(choices=[('scheduled', '예약됨'), ('broadcasting', '방송중'), ('completed', '완료'), ('cancelled', '취소됨')], default='scheduled', max_length=20, verbose_name='상태')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='생성일')),
                ('audio_file', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='broadcast.audiofile', verbose_name='오디오 파일')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL, verbose_name='생성자')),
            ],
            options={
                'verbose_name': '방송 예약',
                'verbose_name_plural': '방송 예약',
                'db_table': 'broadcast_schedule',
                'ordering': ['scheduled_at'],
            },
        ),
    ]
