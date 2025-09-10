from django.core.management.base import BaseCommand
from rentals.models import Rental, EquipmentHistory, Equipment
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Rental의 상태변화 이력을 EquipmentHistory로 마이그레이션합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='기존 마이그레이션 이력을 강제로 삭제하고 다시 생성합니다.',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Rental → EquipmentHistory 마이그레이션 시작'))
        
        # 기존 마이그레이션 이력 확인
        existing_count = EquipmentHistory.objects.filter(details__startswith='마이그레이션: Rental #').count()
        
        if existing_count > 0:
            if options['force']:
                self.stdout.write(f'기존 마이그레이션 이력 {existing_count}건을 삭제합니다.')
                EquipmentHistory.objects.filter(details__startswith='마이그레이션: Rental #').delete()
            else:
                self.stdout.write(self.style.WARNING(f'이미 마이그레이션된 이력이 {existing_count}건 있습니다. --force 옵션을 사용하여 다시 마이그레이션하세요.'))
                return
        
        count = 0
        with transaction.atomic():
            # 모든 장비에 대해 생성 이력 추가 (없는 경우)
            for equipment in Equipment.objects.all():
                if not EquipmentHistory.objects.filter(equipment=equipment, action='CREATED').exists():
                    EquipmentHistory.objects.create(
                        equipment=equipment,
                        action='CREATED',
                        user=User.objects.filter(is_superuser=True).first() or User.objects.first(),
                        new_value={
                            'asset_number': equipment.asset_number,
                            'manufacturer': equipment.manufacturer,
                            'model_name': equipment.model_name,
                            'equipment_type': equipment.equipment_type,
                            'serial_number': equipment.serial_number,
                            'status': equipment.status,
                            'acquisition_date': equipment.acquisition_date.isoformat() if equipment.acquisition_date else None,
                            'manufacture_year': equipment.manufacture_year,
                            'purchase_date': equipment.purchase_date.isoformat() if equipment.purchase_date else None,
                            'purchase_price': str(equipment.purchase_price) if equipment.purchase_price else None,
                            'management_number': equipment.management_number
                        },
                        details=f"마이그레이션: 장비 생성 - {equipment.asset_number or equipment.model_name or equipment.serial_number}",
                        created_at=equipment.created_at if hasattr(equipment, 'created_at') else timezone.now()
                    )
                    count += 1
            
            # 모든 대여 기록에 대해 이력 생성
            for rental in Rental.objects.all().order_by('rental_date'):
                # 1. 대여 이력 (RENTED, OVERDUE)
                if rental.status in ['RENTED', 'OVERDUE'] and rental.rental_date:
                    EquipmentHistory.objects.create(
                        equipment=rental.equipment,
                        action='RENTED',
                        user=rental.approved_by or rental.user,
                        new_value={
                            'rental_id': rental.id,
                            'user_id': rental.user.id,
                            'username': rental.user.username,
                            'rental_date': rental.rental_date.isoformat() if rental.rental_date else None,
                            'due_date': rental.due_date.isoformat() if rental.due_date else None,
                            'status': rental.status
                        },
                        details=f"마이그레이션: Rental #{rental.id} 대여 - {f'{rental.user.last_name} {rental.user.first_name}' if rental.user.last_name and rental.user.first_name else (rental.user.last_name or rental.user.first_name or rental.user.username)} ({rental.user.username})",
                        created_at=rental.rental_date
                    )
                    count += 1
                
                # 2. 반납 이력 (RETURNED)
                if rental.status == 'RETURNED' and rental.return_date:
                    EquipmentHistory.objects.create(
                        equipment=rental.equipment,
                        action='RETURNED',
                        user=rental.returned_to or rental.user,
                        old_value={
                            'rental_id': rental.id,
                            'user_id': rental.user.id,
                            'username': rental.user.username,
                            'status': 'RENTED'
                        },
                        new_value={
                            'status': 'AVAILABLE',
                            'return_date': rental.return_date.isoformat(),
                            'returned_to': (rental.returned_to.username if rental.returned_to else None)
                        },
                        details=f"마이그레이션: Rental #{rental.id} 반납 - {f'{rental.user.last_name} {rental.user.first_name}' if rental.user.last_name and rental.user.first_name else (rental.user.last_name or rental.user.first_name or rental.user.username)} ({rental.user.username})",
                        created_at=rental.return_date
                    )
                    count += 1
                
                # 3. 기타 상태 (LOST, DAMAGED 등)
                if rental.status in ['LOST', 'DAMAGED'] and rental.rental_date:
                    EquipmentHistory.objects.create(
                        equipment=rental.equipment,
                        action='STATUS_CHANGED',
                        user=rental.approved_by or rental.user,
                        old_value={
                            'rental_id': rental.id,
                            'user_id': rental.user.id,
                            'username': rental.user.username,
                            'status': 'RENTED'
                        },
                        new_value={
                            'status': rental.status,
                            'notes': rental.notes
                        },
                        details=f"마이그레이션: Rental #{rental.id} 상태 변경 - {rental.status}",
                        created_at=rental.rental_date
                    )
                    count += 1
        
        self.stdout.write(self.style.SUCCESS(f'마이그레이션 완료: {count}건 EquipmentHistory 생성'))
        total_count = EquipmentHistory.objects.count()
        self.stdout.write(f'총 EquipmentHistory 개수: {total_count}건') 