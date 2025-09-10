# 관리번호 체계 변경 마이그레이션 가이드

## 개요
기존 관리번호 체계 `카테고리-년도-번호`에서 새로운 체계 `카테고리-년도-모델-번호`로 변경합니다.

## 새로운 체계
- **기존**: `L-2024-001` (노트북-2024년-001번)
- **새로운**: `L-2024-MacBookPro-001` (노트북-2024년-MacBookPro모델-001번)

## 도커 환경에서 실행 방법

### 1. 마이그레이션 파일 생성
```bash
# 백엔드 컨테이너에 접속
docker exec -it bssm_backend bash

# 마이그레이션 파일 생성
python manage.py makemigrations rentals

# 마이그레이션 실행
python manage.py migrate
```

### 2. 안전한 데이터 마이그레이션
```bash
# 백업 실행
python scripts/migrate_management_numbers.py --backup

# 마이그레이션 실행
python scripts/migrate_management_numbers.py --migrate

# 결과 검증
python scripts/migrate_management_numbers.py --verify

# 또는 모든 작업을 한 번에 실행
python scripts/migrate_management_numbers.py --all
```

### 3. 롤백 방법 (필요시)
```bash
# 백업 파일에서 복원
python manage.py shell
```
```python
import json
from rentals.models import Equipment

# 백업 파일 로드
with open('management_number_backup.json', 'r', encoding='utf-8') as f:
    backup_data = json.load(f)

# 복원
for item in backup_data:
    equipment = Equipment.objects.get(id=item['id'])
    equipment.management_number = item['old_number']
    equipment.save()
```

## 새로운 기능

### EquipmentModel 테이블
- 연도별, 카테고리별, 모델별로 모델 번호를 관리
- 최초 등록 순서대로 모델 번호 자동 부여
- Django Admin에서 모델 번호 수동 조정 가능

### 관리번호 생성 로직
- 모델명이 있는 경우: `카테고리-년도-모델명-모델번호`
- 모델명이 없는 경우: 기존 방식 `카테고리-년도-번호` 유지

## 주의사항

1. **백업 필수**: 마이그레이션 전 반드시 백업 실행
2. **도커 볼륨**: 백업 파일은 도커 볼륨에 저장됨
3. **롤백 준비**: 문제 발생 시 백업 파일로 복원 가능
4. **테스트 환경**: 먼저 테스트 환경에서 실행 권장

## 검증 방법

### 관리번호 형식 확인
```python
# 새로운 체계
Equipment.objects.filter(management_number__regex=r'^[A-Z]-\d{4}-.+-\d{3}$')

# 기존 체계
Equipment.objects.filter(management_number__regex=r'^[A-Z]-\d{4}-\d{3}$')
```

### EquipmentModel 테이블 확인
```python
from rentals.models import EquipmentModel

# 연도별 모델 통계
EquipmentModel.objects.values('year', 'equipment_type').annotate(
    count=Count('id')
).order_by('year', 'equipment_type')
```

## 문제 해결

### 마이그레이션 실패 시
1. 백업 파일 확인: `management_number_backup.json`
2. 롤백 실행
3. 로그 확인 후 재시도

### 중복 관리번호 발생 시
```python
# 중복 확인
from rentals.models import Equipment
duplicates = Equipment.objects.values('management_number').annotate(
    count=Count('id')
).filter(count__gt=1)
```

### EquipmentModel 중복 시
```python
# 중복 모델 확인
from rentals.models import EquipmentModel
duplicates = EquipmentModel.objects.values(
    'equipment_type', 'year', 'model_name'
).annotate(count=Count('id')).filter(count__gt=1)
``` 