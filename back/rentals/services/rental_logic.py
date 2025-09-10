from __future__ import annotations

from typing import Optional, Tuple

from django.utils import timezone
from django.db import transaction

from rentals.models import Equipment, Rental, EquipmentHistory


def auto_return_active_rentals(
    equipment: Equipment,
    actor,
    record_history: bool = True,
) -> int:
    """Return all active rentals (RENTED/OVERDUE) for the given equipment.

    Returns the number of rentals returned.
    """
    active_rentals = Rental.objects.filter(
        equipment=equipment,
        status__in=["RENTED", "OVERDUE"],
    )

    returned_count = 0
    for rental in active_rentals:
        rental.status = "RETURNED"
        rental.return_date = timezone.now()
        rental.returned_to = actor if getattr(actor, "is_staff", False) else None
        rental.save()
        returned_count += 1

        if record_history:
            EquipmentHistory.objects.create(
                equipment=equipment,
                action="RETURNED",
                user=actor,
                old_value={
                    "rental_id": rental.id,
                    "user_id": rental.user.id,
                    "username": rental.user.username,
                    "status": "RENTED",
                },
                new_value={
                    "status": "AVAILABLE",
                    "return_date": rental.return_date.isoformat(),
                    "returned_to": getattr(actor, "username", None)
                    if getattr(actor, "is_staff", False)
                    else None,
                },
                details=(
                    f"장비 '{equipment.asset_number or equipment.model_name or equipment.serial_number}' "
                    f"반납 from {rental.user.username}"
                ),
            )

    return returned_count


def create_rental(
    equipment: Equipment,
    user,
    approved_by,
    due_date=None,
    notes: str = "",
    record_history: bool = True,
) -> Rental:
    """Create a new rental for the equipment after auto-returning any actives."""
    with transaction.atomic():
        # Return any active rentals first
        auto_return_active_rentals(equipment, approved_by, record_history=record_history)

        # Ensure equipment marked as RENTED
        equipment.status = "RENTED"
        equipment.save()

        if not due_date:
            due_date = timezone.now() + timezone.timedelta(days=30)

        rental = Rental.objects.create(
            user=user,
            equipment=equipment,
            rental_date=timezone.now(),
            due_date=due_date,
            status="RENTED",
            notes=notes,
            approved_by=approved_by if getattr(approved_by, "is_staff", False) else None,
        )

        if record_history:
            EquipmentHistory.objects.create(
                equipment=equipment,
                action="RENTED",
                user=approved_by,
                new_value={
                    "rental_id": rental.id,
                    "user_id": user.id,
                    "username": user.username,
                    "rental_date": rental.rental_date.isoformat(),
                    "due_date": rental.due_date.isoformat(),
                    "status": "RENTED",
                },
                details=(
                    f"장비 '{equipment.asset_number or equipment.model_name or equipment.serial_number}' "
                    f"대여 to {user.username}"
                ),
            )

        return rental


def change_equipment_status(
    equipment: Equipment,
    new_status: str,
    actor,
    reason: str | None = None,
    renter=None,
    due_date=None,
    notes: str | None = None,
    record_history: bool = True,
) -> Tuple[int, Optional[Rental]]:
    """Change equipment status with proper rental side-effects.

    Returns (auto_returned_count, created_rental or None).
    """
    created_rental = None
    auto_count = 0

    with transaction.atomic():
        if new_status == "AVAILABLE":
            auto_count = auto_return_active_rentals(
                equipment, actor, record_history=record_history
            )
            equipment.status = "AVAILABLE"
            equipment.save()
        elif new_status == "RENTED":
            if renter is None:
                raise ValueError("RENTED 상태로 변경하려면 renter가 필요합니다.")
            created_rental = create_rental(
                equipment=equipment,
                user=renter,
                approved_by=actor,
                due_date=due_date,
                notes=notes or "",
                record_history=record_history,
            )
        else:
            equipment.status = new_status
            equipment.save()

        if record_history:
            # STATUS_CHANGED history entry
            EquipmentHistory.objects.create(
                equipment=equipment,
                action="STATUS_CHANGED",
                user=actor,
                old_value={},  # 호출부에서 세부 old_status를 덧붙일 수 있음
                new_value={
                    "status": new_status,
                    "reason": reason,
                    "user_id": getattr(renter, "id", None),
                    "username": getattr(renter, "username", None),
                },
                details=(
                    f"장비 상태 변경: {new_status}"
                    + (f" (자동 반납 {auto_count}건)" if new_status == "AVAILABLE" and auto_count else "")
                    + (f" (대여자: {getattr(renter, 'username', '')})" if new_status == "RENTED" and renter else "")
                    + (f" (사유: {reason})" if reason else "")
                ).strip(),
            )

    return auto_count, created_rental


def return_rental(rental: Rental, actor, record_history: bool = True) -> None:
    """Return a specific rental and set equipment AVAILABLE if no other actives."""
    with transaction.atomic():
        # Return target rental
        rental.status = "RETURNED"
        rental.return_date = timezone.now()
        rental.returned_to = actor if getattr(actor, "is_staff", False) else None
        rental.save()

        equipment = rental.equipment

        # If no other active rentals exist, set equipment AVAILABLE
        other_active = Rental.objects.filter(
            equipment=equipment, status__in=["RENTED", "OVERDUE"]
        ).exclude(id=rental.id)
        if not other_active.exists():
            equipment.status = "AVAILABLE"
            equipment.save()

        if record_history:
            EquipmentHistory.objects.create(
                equipment=equipment,
                action="RETURNED",
                user=actor,
                old_value={
                    "rental_id": rental.id,
                    "user_id": rental.user.id,
                    "username": rental.user.username,
                    "status": "RENTED",
                },
                new_value={
                    "status": "AVAILABLE",
                    "return_date": rental.return_date.isoformat(),
                    "returned_to": getattr(actor, "username", None)
                    if getattr(actor, "is_staff", False)
                    else None,
                },
                details=(
                    f"장비 '{equipment.asset_number or equipment.model_name or equipment.serial_number}' "
                    f"반납 from {rental.user.username}"
                ),
            )




