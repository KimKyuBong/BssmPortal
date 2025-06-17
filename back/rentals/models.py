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
        ('TABLET', '태블릿'),
        ('DESKTOP', '데스크톱'),
        ('MONITOR', '모니터'),
        ('KEYBOARD', '키보드'),
        ('MOUSE', '마우스'),
        ('PRINTER', '프린터'),
        ('PROJECTOR', '프로젝터'),
        ('OTHER', '기타'),
    ]
    
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
    대여 및 반납 요청 모델
    """
    TYPE_CHOICES = (
        ('RENT', '대여 신청'),
        ('RETURN', '반납 신청')
    )
    
    STATUS_CHOICES = (
        ('PENDING', '승인 대기'),
        ('APPROVED', '승인됨'),
        ('REJECTED', '거부됨'),
        ('CANCELLED', '취소됨')
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='rental_requests', verbose_name='신청자')
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='rental_requests', verbose_name='장비')
    rental = models.ForeignKey(Rental, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests', verbose_name='대여 정보')
    
    request_type = models.CharField(max_length=10, choices=TYPE_CHOICES, verbose_name='요청 유형')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING', verbose_name='상태')
    
    requested_date = models.DateTimeField(default=timezone.now, verbose_name='신청일')
    expected_return_date = models.DateTimeField(blank=True, null=True, verbose_name='반납 예정일')
    request_reason = models.TextField(blank=True, verbose_name='신청 사유')
    reject_reason = models.TextField(blank=True, verbose_name='거절 사유')
    
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='processed_requests', verbose_name='처리자')
    processed_at = models.DateTimeField(blank=True, null=True, verbose_name='처리일')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일')
    
    def __str__(self):
        return f"{self.user.username} - {self.get_request_type_display()} ({self.get_status_display()})"
    
    class Meta:
        verbose_name = '대여/반납 요청'
        verbose_name_plural = '대여/반납 요청들'
