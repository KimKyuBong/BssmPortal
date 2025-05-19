from django.db import models
from django.conf import settings

class Device(models.Model):
    mac_address = models.CharField(max_length=17, unique=True)
    device_name = models.CharField(max_length=100)
    assigned_ip = models.GenericIPAddressField(null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_access = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='devices')

    class Meta:
        db_table = 'devices'

class DeviceHistory(models.Model):
    class Action(models.TextChoices):
        REGISTER = 'REGISTER'
        UNREGISTER = 'UNREGISTER'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)
    mac_address = models.CharField(max_length=255)
    device_name = models.CharField(max_length=255)
    assigned_ip = models.GenericIPAddressField(null=True)
    action = models.CharField(max_length=10, choices=Action.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'device_histories'

# DeviceLease 모델은 사용하지 않으므로 주석 처리합니다.
# class DeviceLease(models.Model):
#     device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='leases')
#     user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='device_leases')
#     start_time = models.DateTimeField(auto_now_add=True)
#     end_time = models.DateTimeField(null=True)
#     ip_address = models.GenericIPAddressField()
#     is_active = models.BooleanField(default=True)
#
#     class Meta:
#         db_table = 'device_leases'

