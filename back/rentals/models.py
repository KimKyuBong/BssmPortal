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
    acquisition_date = models.DateField('취득일', default=timezone.now)
    manufacture_year = models.IntegerField('제작년도', null=True, blank=True)
    purchase_date = models.DateTimeField('구입일시', null=True, blank=True)
    management_number = models.CharField('관리번호', max_length=20, unique=True, null=True, blank=True)
    purchase_price = models.DecimalField('구입금액', max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField('등록일', auto_now_add=True)
    updated_at = models.DateTimeField('수정일', auto_now=True)

    def generate_management_number(self):
        """관리번호 생성 메서드 - 구매년도 기준"""
        # 구매일이 없으면 관리번호를 생성하지 않음
        if not self.purchase_date:
            return None
            
        # 장비 유형 이니셜 가져오기
        initial = self.EQUIPMENT_TYPE_INITIALS.get(self.equipment_type, 'O')
        
        # 구매년도 가져오기
        year = self.purchase_date.year
        
        # 같은 유형, 같은 연도의 장비 중 가장 큰 일련번호 찾기
        base_number = f"{initial}-{year}"
        existing_numbers = Equipment.objects.filter(
            management_number__startswith=base_number
        ).values_list('management_number', flat=True)
        
        # 일련번호 추출 및 최대값 찾기
        max_sequence = 0
        for number in existing_numbers:
            try:
                sequence = int(number.split('-')[-1])
                max_sequence = max(max_sequence, sequence)
            except (ValueError, IndexError):
                continue
        
        # 새로운 일련번호 생성
        new_sequence = max_sequence + 1
        
        # 최종 관리번호 생성 (예: N-2024-001)
        return f"{base_number}-{new_sequence:03d}"

    def save(self, *args, **kwargs):
        """저장 시 관리번호 자동 생성/업데이트"""
        # 기존 인스턴스가 있는지 확인 (수정인지 새로 생성인지)
        if self.pk:
            try:
                old_instance = Equipment.objects.get(pk=self.pk)
                # 구매일이 변경된 경우에만 관리번호 재생성
                if old_instance.purchase_date != self.purchase_date:
                    if self.purchase_date:
                        self.management_number = self.generate_management_number()
                    else:
                        self.management_number = None
            except Equipment.DoesNotExist:
                # 새로 생성되는 경우
                if self.purchase_date and not self.management_number:
                    self.management_number = self.generate_management_number()
        else:
            # 새로 생성되는 경우
            if self.purchase_date and not self.management_number:
                self.management_number = self.generate_management_number()
        
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = '장비'
        verbose_name_plural = '장비'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.asset_number} ({self.get_equipment_type_display()})'


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
