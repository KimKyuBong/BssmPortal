from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rentals.models import EquipmentHistory
import re

User = get_user_model()

class Command(BaseCommand):
    help = '기존 장비 이력의 사용자 정보 표시 형식을 업데이트합니다'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 업데이트 없이 변경될 내용만 확인',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write(
            self.style.SUCCESS('장비 이력 사용자 정보 표시 형식 업데이트를 시작합니다...')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN 모드: 실제 업데이트는 수행되지 않습니다.')
            )
        
        updated_count = 0
        
        # 대여 이력 패턴: "장비 'xxx' 대여 to username" (단순 숫자 제외)
        rental_pattern = r"장비 '([^']+)' 대여 to ([a-zA-Z가-힣][a-zA-Z0-9가-힣._]*|[0-9]+[._][0-9]+|[0-9]+_[0-9]+)"
        
        # 반납 이력 패턴: "장비 'xxx' 반납 from username" (단순 숫자 제외)
        return_pattern = r"장비 '([^']+)' 반납 from ([a-zA-Z가-힣][a-zA-Z0-9가-힣._]*|[0-9]+[._][0-9]+|[0-9]+_[0-9]+)"
        
        # 마이그레이션 이력 패턴: "마이그레이션: Rental #xxx 대여 - username" (단순 숫자 제외)
        migration_rental_pattern = r"마이그레이션: Rental #(\d+) 대여 - ([a-zA-Z가-힣][a-zA-Z0-9가-힣._]*|[0-9]+[._][0-9]+|[0-9]+_[0-9]+)"
        
        # 마이그레이션 이력 패턴: "마이그레이션: Rental #xxx 반납 - username" (단순 숫자 제외)
        migration_return_pattern = r"마이그레이션: Rental #(\d+) 반납 - ([a-zA-Z가-힣][a-zA-Z0-9가-힣._]*|[0-9]+[._][0-9]+|[0-9]+_[0-9]+)"
        
        for history in EquipmentHistory.objects.all():
            original_details = history.details
            updated_details = original_details
            
            # 대여 이력 업데이트
            match = re.search(rental_pattern, original_details)
            if match:
                equipment_name = match.group(1)
                username = match.group(2)
                
                try:
                    user = User.objects.get(username=username)
                    # 이름이 있으면 "성 이름" 형태로, 없으면 아이디만 사용
                    if user.last_name and user.first_name:
                        user_name = f"{user.last_name} {user.first_name}"
                    elif user.last_name:
                        user_name = user.last_name
                    elif user.first_name:
                        user_name = user.first_name
                    else:
                        user_name = user.username
                    new_format = f"장비 '{equipment_name}' 대여 to {user_name} ({user.username})"
                    updated_details = re.sub(rental_pattern, new_format, updated_details)
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'사용자를 찾을 수 없습니다: {username}')
                    )
                    continue
            
            # 반납 이력 업데이트
            match = re.search(return_pattern, original_details)
            if match:
                equipment_name = match.group(1)
                username = match.group(2)
                
                try:
                    user = User.objects.get(username=username)
                    # 이름이 있으면 "성 이름" 형태로, 없으면 아이디만 사용
                    if user.last_name and user.first_name:
                        user_name = f"{user.last_name} {user.first_name}"
                    elif user.last_name:
                        user_name = user.last_name
                    elif user.first_name:
                        user_name = user.first_name
                    else:
                        user_name = user.username
                    new_format = f"장비 '{equipment_name}' 반납 from {user_name} ({user.username})"
                    updated_details = re.sub(return_pattern, new_format, updated_details)
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'사용자를 찾을 수 없습니다: {username}')
                    )
                    continue
            
            # 마이그레이션 대여 이력 업데이트
            match = re.search(migration_rental_pattern, original_details)
            if match:
                rental_id = match.group(1)
                username = match.group(2)
                
                try:
                    user = User.objects.get(username=username)
                    # 이름이 있으면 "성 이름" 형태로, 없으면 아이디만 사용
                    if user.last_name and user.first_name:
                        user_name = f"{user.last_name} {user.first_name}"
                    elif user.last_name:
                        user_name = user.last_name
                    elif user.first_name:
                        user_name = user.first_name
                    else:
                        user_name = user.username
                    new_format = f"마이그레이션: Rental #{rental_id} 대여 - {user_name} ({user.username})"
                    updated_details = re.sub(migration_rental_pattern, new_format, updated_details)
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'사용자를 찾을 수 없습니다: {username}')
                    )
                    continue
            
            # 마이그레이션 반납 이력 업데이트
            match = re.search(migration_return_pattern, original_details)
            if match:
                rental_id = match.group(1)
                username = match.group(2)
                
                try:
                    user = User.objects.get(username=username)
                    # 이름이 있으면 "성 이름" 형태로, 없으면 아이디만 사용
                    if user.last_name and user.first_name:
                        user_name = f"{user.last_name} {user.first_name}"
                    elif user.last_name:
                        user_name = user.last_name
                    elif user.first_name:
                        user_name = user.first_name
                    else:
                        user_name = user.username
                    new_format = f"마이그레이션: Rental #{rental_id} 반납 - {user_name} ({user.username})"
                    updated_details = re.sub(migration_return_pattern, new_format, updated_details)
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'사용자를 찾을 수 없습니다: {username}')
                    )
                    continue
            
            # 변경사항이 있으면 업데이트
            if updated_details != original_details:
                if dry_run:
                    self.stdout.write(f'변경 예정: {original_details} -> {updated_details}')
                else:
                    history.details = updated_details
                    history.save()
                
                updated_count += 1
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'DRY RUN 완료: {updated_count}개의 이력이 업데이트될 예정입니다.')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'업데이트 완료: {updated_count}개의 이력이 업데이트되었습니다.')
            )
