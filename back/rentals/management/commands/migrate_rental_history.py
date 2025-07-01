from django.core.management.base import BaseCommand
from rentals.models import Rental, EquipmentHistory
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()

class Command(BaseCommand):
    help = 'Rental의 상태변화 이력을 EquipmentHistory로 마이그레이션합니다.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Rental → EquipmentHistory 마이그레이션 시작'))
        count = 0
        # 기존 마이그레이션 이력 삭제 (마이그레이션으로 생성된 이력만)
        EquipmentHistory.objects.filter(details__startswith='마이그레이션: Rental #').delete()
        with transaction.atomic():
            for rental in Rental.objects.all():
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
                        details=f"마이그레이션: Rental #{rental.id} 대여",
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
                        details=f"마이그레이션: Rental #{rental.id} 반납",
                        created_at=rental.return_date
                    )
                    count += 1
                # 3. 기타 상태(분실, 손상 등) 필요시 추가 가능
        self.stdout.write(self.style.SUCCESS(f'마이그레이션 완료: {count}건 EquipmentHistory 생성')) 