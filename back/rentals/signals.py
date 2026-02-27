"""
장비 대여 관련 시그널
- 사용자 삭제 시 미반납 장비가 있으면 삭제 차단
"""
from django.db.models.signals import pre_delete
from django.dispatch import receiver


@receiver(pre_delete)
def prevent_user_delete_with_active_rentals(sender, instance, **kwargs):
    """
    User 모델 삭제 시 미반납(대여중/연체) 장비가 있으면 삭제를 차단합니다.
    API, Admin, 배치 등 모든 삭제 경로에 적용됩니다.
    """
    from django.contrib.auth import get_user_model
    from rentals.services.rental_logic import get_user_active_rental_count

    if sender is not get_user_model():
        return

    cnt = get_user_active_rental_count(instance)
    if cnt > 0:
        from django.core.exceptions import PermissionDenied
        raise PermissionDenied(
            f"사용자 '{instance.username}'은(는) 현재 {cnt}개의 장비를 대여 중입니다. "
            "모든 장비를 반납한 후 삭제할 수 있습니다."
        )
