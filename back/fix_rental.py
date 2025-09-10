#!/usr/bin/env python
import os
import sys
import django

# Django 설정
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'back.core.settings')
django.setup()

from rentals.models import Equipment, Rental
from django.utils import timezone

# 장비 찾기
equipment = Equipment.objects.get(serial_number='011NZKZ013437')
print(f'수정 전 - 장비 상태: {equipment.status}')

# 활성 대여 기록 찾기
active_rentals = Rental.objects.filter(
    equipment=equipment, 
    status__in=['RENTED', 'OVERDUE']
)
print(f'활성 대여 기록 수: {active_rentals.count()}')

# 대여 기록 반납 처리
for rental in active_rentals:
    print(f'대여 기록 {rental.id} 반납 처리 중...')
    rental.status = 'RETURNED'
    rental.return_date = timezone.now()
    rental.save()
    print(f'대여 기록 {rental.id} 반납 처리 완료')

# 장비 상태를 AVAILABLE로 변경
equipment.status = 'AVAILABLE'
equipment.save()
print(f'장비 상태를 AVAILABLE로 변경 완료')

# 수정 후 상태 확인
equipment.refresh_from_db()
print(f'수정 후 - 장비 상태: {equipment.status}')

# 최종 확인
final_rentals = Rental.objects.filter(
    equipment=equipment, 
    status__in=['RENTED', 'OVERDUE']
)
print(f'최종 활성 대여 기록 수: {final_rentals.count()}')
