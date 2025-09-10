from django.db import models
from django.conf import settings
from django.utils import timezone

def get_default_due_date():
    return timezone.now().replace(month=12, day=31)

class EquipmentMacAddress(models.Model):
    """
    장비의 MAC 주소 모델
    """
    equipment = models.ForeignKey('Equipment', on_delete=models.CASCADE, related_name='mac_addresses', verbose_name='장비')
    mac_address = models.CharField(max_length=17, verbose_name='MAC 주소')
    interface_type = models.CharField(max_length=20, choices=(
        ('ETHERNET', '이더넷'),
        ('WIFI', '와이파이'),
        ('OTHER', '기타')
    ), verbose_name='인터페이스 종류')
    is_primary = models.BooleanField(default=False, verbose_name='기본 MAC 주소')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일')
    
    def __str__(self):
        return f"{self.equipment.asset_number} - {self.mac_address} ({self.get_interface_type_display()})"
    
    class Meta:
        verbose_name = '장비 MAC 주소'
        verbose_name_plural = '장비 MAC 주소들'
        unique_together = ('equipment', 'mac_address')


class Equipment(models.Model):
    """
    대여 가능한 장비 모델
    """
    EQUIPMENT_TYPE_CHOICES = [
        ('LAPTOP', '노트북'),
        ('MACBOOK', '맥북'),
        ('TABLET', '태블릿'),
        ('DESKTOP', '데스크톱'),
        ('MONITOR', '모니터'),
        ('PRINTER', '프린터'),
        ('PROJECTOR', '프로젝터'),
        ('OTHER', '기타'),
    ]
    
    # 장비 유형별 이니셜 매핑
    EQUIPMENT_TYPE_INITIALS = {
        'LAPTOP': 'L',  # 노트북
        'MACBOOK': 'M',  # 맥북
        'TABLET': 'T',
        'DESKTOP': 'D',
        'MONITOR': 'D',  # Display
        'PRINTER': 'P',
        'PROJECTOR': 'J',  # Projector
        'OTHER': 'O',
    }
    
    STATUS_CHOICES = [
        ('AVAILABLE', '사용 가능'),
        ('RENTED', '대여 중'),
        ('MAINTENANCE', '점검 중'),
        ('BROKEN', '고장'),
        ('LOST', '분실'),
        ('DISPOSED', '폐기'),
    ]
    
    asset_number = models.CharField('물품번호', max_length=100, null=True, blank=True)
    manufacturer = models.CharField('제조사', max_length=100, null=True, blank=True)
    model_name = models.CharField('모델명', max_length=100, null=True, blank=True)
    equipment_type = models.CharField('장비 유형', max_length=20, choices=EQUIPMENT_TYPE_CHOICES)
    serial_number = models.CharField('시리얼 번호', max_length=100, unique=True)
    description = models.TextField('설명', blank=True)
    status = models.CharField('상태', max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    acquisition_date = models.DateField('취득일', null=True, blank=True)
    manufacture_year = models.IntegerField('제작년도', null=True, blank=True)
    purchase_date = models.DateField('구입일', null=True, blank=True)
    management_number = models.CharField('관리번호', max_length=50, unique=True, null=True, blank=True)
    purchase_price = models.DecimalField('구입금액', max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField('등록일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)

    def generate_management_number(self):
        """관리번호 생성 메서드 - 카테고리-년도-모델-번호 체계"""
        # 구매일이 없으면 관리번호를 생성하지 않음
        if not self.purchase_date:
            return None
            
        # 장비 유형 이니셜 가져오기
        initial = self.EQUIPMENT_TYPE_INITIALS.get(self.equipment_type, 'O')
        
        # 구매년도 가져오기
        year = self.purchase_date.year
        
        # 모델명이 없으면 기존 방식 사용
        if not self.model_name:
            # 같은 유형, 같은 연도의 장비 중 가장 큰 일련번호 찾기
            base_number = f"{initial}-{year}"
            existing_numbers = Equipment.objects.filter(
                management_number__startswith=base_number
            ).values_list('management_number', flat=True)
            
            # 일련번호 추출 및 최대값 찾기 (새로운 양식만 처리)
            max_sequence = 0
            for number in existing_numbers:
                try:
                    # 새로운 양식: D-2020-001 (3개 부분)
                    if len(number.split('-')) == 3:
                        sequence = int(number.split('-')[-1])
                        max_sequence = max(max_sequence, sequence)
                except (ValueError, IndexError):
                    continue
            
            # 새로운 일련번호 생성
            new_sequence = max_sequence + 1
            
            # 최종 관리번호 생성 (예: N-2024-001)
            return f"{base_number}-{new_sequence:03d}"
        
        # 새로운 체계: 카테고리-년도-모델-번호
        try:
            # EquipmentModel 테이블에서 모델 번호 가져오기
            model_number = EquipmentModel.get_or_create_model_number(
                self.equipment_type, 
                year, 
                self.model_name
            )
        except Exception as e:
            # EquipmentModel 생성 중 오류가 발생하면 기본값 사용
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"EquipmentModel 생성 중 오류: {str(e)}")
            model_number = 1
        
        # 최종 관리번호 생성 (예: L-2024-01-001)
        base_number = f"{initial}-{year}-{model_number:02d}"
        
        # 같은 모델의 장비들을 created_at 순서대로 정렬 (오래된 것부터)
        # created_at이 None인 장비는 제외하고 처리
        same_model_equipments = Equipment.objects.filter(
            model_name=self.model_name,
            equipment_type=self.equipment_type,
            purchase_date__year=year,
            created_at__isnull=False  # created_at이 None이 아닌 것만
        ).order_by('created_at')
        
        # 현재 장비의 created_at 순서에서의 위치 찾기
        sequence = 1
        
        # 기존 장비들의 순번을 확인하여 연속된 번호 생성
        existing_sequences = []
        for equipment in same_model_equipments:
            if equipment.management_number:
                try:
                    # 관리번호에서 순번 추출 (예: L-2022-01-012 -> 12)
                    parts = equipment.management_number.split('-')
                    if len(parts) >= 4:
                        seq = int(parts[-1])
                        existing_sequences.append(seq)
                except (ValueError, IndexError):
                    continue
        
        # 기존 순번들을 정렬하고 연속되지 않은 첫 번째 번호 찾기
        existing_sequences.sort()
        next_sequence = 1
        
        for seq in existing_sequences:
            if seq == next_sequence:
                next_sequence += 1
            else:
                break
        
        # 현재 장비가 이미 등록되어 있고 관리번호가 있는 경우
        if self.pk and self.management_number:
            try:
                parts = self.management_number.split('-')
                if len(parts) >= 4:
                    current_seq = int(parts[-1])
                    # 현재 순번이 유효한 범위에 있으면 그대로 사용
                    if current_seq not in existing_sequences or current_seq == next_sequence:
                        sequence = current_seq
                    else:
                        sequence = next_sequence
                else:
                    sequence = next_sequence
            except (ValueError, IndexError):
                sequence = next_sequence
        else:
            # 새로 생성되는 장비는 다음 순번 사용
            sequence = next_sequence
        
        # 관리번호 생성
        management_number = f"{base_number}-{sequence:03d}"
        
        # 중복 확인 및 처리
        max_attempts = 10
        attempt = 0
        original_sequence = sequence
        
        while attempt < max_attempts:
            # 이미 존재하는 관리번호인지 확인
            if Equipment.objects.filter(management_number=management_number).exists():
                # 중복이면 다음 순번으로 시도
                sequence += 1
                management_number = f"{base_number}-{sequence:03d}"
                attempt += 1
                
                # 로깅 추가
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"관리번호 중복 발견: {management_number}, 재시도 {attempt}")
            else:
                # 중복이 아니면 사용
                break
        
        # 최대 시도 횟수를 초과한 경우 타임스탬프를 추가하여 고유성 보장
        if attempt >= max_attempts:
            import time
            timestamp = int(time.time())
            management_number = f"{base_number}-{original_sequence:03d}-{timestamp}"
            
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"관리번호 중복 해결 실패, 타임스탬프 추가: {management_number}")
        
        # 최종 중복 확인 (타임스탬프가 추가된 경우에도 중복이 있을 수 있음)
        if Equipment.objects.filter(management_number=management_number).exists():
            import time
            import random
            timestamp = int(time.time())
            random_suffix = random.randint(1000, 9999)
            management_number = f"{base_number}-{original_sequence:03d}-{timestamp}-{random_suffix}"
            
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"최종 관리번호 중복 해결: {management_number}")
        
        return management_number

    def save(self, *args, **kwargs):
        """저장 시 관리번호 자동 생성/업데이트"""
        is_new = self.pk is None
        
        # 먼저 저장하여 created_at이 설정되도록 함
        super().save(*args, **kwargs)
        
        # 저장 후 관리번호 생성/업데이트
        if self.pk:
            try:
                if is_new:
                    # 새로 생성된 경우
                    if self.purchase_date and not self.management_number:
                        self.management_number = self.generate_management_number()
                else:
                    # 기존 인스턴스 수정인 경우
                    old_instance = Equipment.objects.get(pk=self.pk)
                    # 구매일이나 장비유형이 변경된 경우에만 관리번호 재생성
                    if (old_instance.purchase_date != self.purchase_date or 
                        old_instance.equipment_type != self.equipment_type or
                        self.management_number is None):
                        if self.purchase_date:
                            self.management_number = self.generate_management_number()
                        else:
                            self.management_number = None
                        
                        # 관리번호가 변경된 경우 다시 저장
                        if self.management_number != old_instance.management_number:
                            super().save(update_fields=['management_number'])
            except Equipment.DoesNotExist:
                pass

    class Meta:
        verbose_name = '장비'
        verbose_name_plural = '장비'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.asset_number} ({self.get_equipment_type_display()})'


class EquipmentModel(models.Model):
    """
    연도별 모델명 관리 테이블
    """
    equipment_type = models.CharField('장비 유형', max_length=20, choices=Equipment.EQUIPMENT_TYPE_CHOICES)
    year = models.IntegerField('연도')
    model_name = models.CharField('모델명', max_length=100)
    model_number = models.IntegerField('모델 번호')
    created_at = models.DateTimeField('생성일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)
    
    class Meta:
        verbose_name = '장비 모델'
        verbose_name_plural = '장비 모델들'
        unique_together = ('equipment_type', 'year', 'model_name')
        ordering = ['equipment_type', 'year', 'model_number']
    
    def __str__(self):
        return f"{self.get_equipment_type_display()}-{self.year}-{self.model_name}-{self.model_number:03d}"
    
    @classmethod
    def get_or_create_model_number(cls, equipment_type, year, model_name):
        """모델 번호를 가져오거나 새로 생성"""
        try:
            model = cls.objects.get(
                equipment_type=equipment_type,
                year=year,
                model_name=model_name
            )
            return model.model_number
        except cls.DoesNotExist:
            try:
                # 해당 연도, 카테고리의 최대 모델 번호 찾기
                max_number = cls.objects.filter(
                    equipment_type=equipment_type,
                    year=year
                ).aggregate(models.Max('model_number'))['model_number__max'] or 0
                
                # 새 모델 번호 생성
                new_number = max_number + 1
                
                # 새 모델 레코드 생성
                model = cls.objects.create(
                    equipment_type=equipment_type,
                    year=year,
                    model_name=model_name,
                    model_number=new_number
                )
                
                return new_number
            except Exception as e:
                # 데이터베이스 오류 등이 발생하면 기본값 반환
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"EquipmentModel 생성 중 오류: {str(e)}")
                return 1


class Rental(models.Model):
    """
    장비 대여 정보 모델
    """
    STATUS_CHOICES = (
        ('RENTED', '대여 중'),
        ('RETURNED', '반납 완료'),
        ('OVERDUE', '연체'),
        ('LOST', '분실'),
        ('DAMAGED', '손상')
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rentals', verbose_name='사용자')
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='rentals', verbose_name='장비')
    
    rental_date = models.DateTimeField(default=timezone.now, verbose_name='대여일')
    due_date = models.DateTimeField(default=get_default_due_date, verbose_name='반납 예정일')
    return_date = models.DateTimeField(blank=True, null=True, verbose_name='실제 반납일')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RENTED', verbose_name='상태')
    notes = models.TextField(blank=True, verbose_name='비고')
    
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_rentals', verbose_name='승인자')
    returned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_returns', verbose_name='반납 확인자')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일')
    
    def __str__(self):
        return f"{self.user.username} - {self.equipment.asset_number} ({self.status})"
    
    class Meta:
        verbose_name = '대여'
        verbose_name_plural = '대여 내역'


class RentalRequest(models.Model):
    """
    대여/반납 요청 모델
    """
    REQUEST_TYPE_CHOICES = (
        ('RENTAL', '대여 요청'),
        ('RETURN', '반납 요청'),
    )
    
    STATUS_CHOICES = (
        ('PENDING', '대기 중'),
        ('APPROVED', '승인됨'),
        ('REJECTED', '거부됨'),
        ('CANCELLED', '취소됨'),
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rental_requests', verbose_name='사용자')
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='rental_requests', verbose_name='장비')
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES, verbose_name='요청 유형')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name='상태')
    requested_date = models.DateTimeField(default=timezone.now, verbose_name='요청일')
    expected_return_date = models.DateTimeField(blank=True, null=True, verbose_name='반납 예정일')
    request_reason = models.TextField(blank=True, verbose_name='요청 사유')
    reject_reason = models.TextField(blank=True, verbose_name='거부 사유')
    processed_date = models.DateTimeField(blank=True, null=True, verbose_name='처리일')
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_requests', verbose_name='처리자')
    notes = models.TextField(blank=True, verbose_name='비고')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일')
    
    def __str__(self):
        return f"{self.user.username} - {self.equipment.asset_number} ({self.get_request_type_display()})"
    
    class Meta:
        verbose_name = '대여 요청'
        verbose_name_plural = '대여 요청들'
        ordering = ['-requested_date']


class EquipmentHistory(models.Model):
    """
    장비 상태 변경 이력 모델
    """
    ACTION_CHOICES = [
        ('CREATED', '생성'),
        ('UPDATED', '수정'),
        ('STATUS_CHANGED', '상태 변경'),
        ('RENTED', '대여'),
        ('RETURNED', '반납'),
        ('DELETED', '삭제'),
    ]
    
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='histories', verbose_name='장비')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, verbose_name='작업')
    old_value = models.JSONField(null=True, blank=True, verbose_name='이전 값')
    new_value = models.JSONField(null=True, blank=True, verbose_name='새 값')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='작업자')
    details = models.TextField(blank=True, verbose_name='상세 설명')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='작업일시')
    
    def __str__(self):
        return f"{self.equipment.asset_number} - {self.get_action_display()} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
    
    class Meta:
        verbose_name = '장비 이력'
        verbose_name_plural = '장비 이력들'
        ordering = ['-created_at']
