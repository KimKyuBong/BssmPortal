"""
대여 중인 기록(RENTED) 중 사용자 또는 장비가 삭제된 고아(orphan) 레코드 검색
"""
from django.core.management.base import BaseCommand
from django.db import connection

from rentals.models import Rental

# Django 모델의 실제 DB 테이블명 사용
RENTAL_TABLE = Rental._meta.db_table
USER_TABLE = Rental._meta.get_field('user').related_model._meta.db_table
EQUIPMENT_TABLE = Rental._meta.get_field('equipment').related_model._meta.db_table


class Command(BaseCommand):
    help = '대여 중(RENTED)인 기록 중 사용자/장비가 삭제된 고아 레코드를 검색합니다.'

    def handle(self, *args, **options):
        self.stdout.write('대여 고아 레코드 검색 시작...')

        with connection.cursor() as cursor:
            # 사용자가 삭제된 대여 기록 (user_id가 users 테이블에 없음)
            cursor.execute(f"""
                SELECT r.id, r.user_id, r.equipment_id, r.status, r.rental_date
                FROM {RENTAL_TABLE} r
                LEFT JOIN {USER_TABLE} u ON r.user_id = u.id
                WHERE r.status IN ('RENTED', 'OVERDUE') AND u.id IS NULL
            """)
            user_orphans = cursor.fetchall()

            # 장비가 삭제된 대여 기록 (equipment_id가 rentals_equipment에 없음)
            cursor.execute(f"""
                SELECT r.id, r.user_id, r.equipment_id, r.status, r.rental_date
                FROM {RENTAL_TABLE} r
                LEFT JOIN {EQUIPMENT_TABLE} e ON r.equipment_id = e.id
                WHERE r.status IN ('RENTED', 'OVERDUE') AND e.id IS NULL
            """)
            equipment_orphans = cursor.fetchall()

        if user_orphans:
            self.stdout.write(self.style.ERROR(f'\n[사용자 삭제됨] {len(user_orphans)}건'))
            for row in user_orphans:
                rid, uid, eid, status, rdate = row
                self.stdout.write(f'  - Rental id={rid}, user_id={uid}, equipment_id={eid}, status={status}, rental_date={rdate}')
        else:
            self.stdout.write(self.style.SUCCESS('\n[사용자 삭제됨] 없음'))

        if equipment_orphans:
            self.stdout.write(self.style.ERROR(f'\n[장비 삭제됨] {len(equipment_orphans)}건'))
            for row in equipment_orphans:
                rid, uid, eid, status, rdate = row
                self.stdout.write(f'  - Rental id={rid}, user_id={uid}, equipment_id={eid}, status={status}, rental_date={rdate}')
        else:
            self.stdout.write(self.style.SUCCESS('\n[장비 삭제됨] 없음'))

        if not user_orphans and not equipment_orphans:
            self.stdout.write(self.style.SUCCESS('\n고아 대여 기록이 없습니다.'))
        else:
            total = len(set(o[0] for o in user_orphans) | set(o[0] for o in equipment_orphans))
            self.stdout.write(self.style.WARNING(f'\n총 {total}건의 고아 대여 기록이 발견되었습니다.'))
