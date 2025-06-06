from django.contrib import admin
from .models import Equipment, Rental, RentalRequest

@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'equipment_type', 'serial_number', 'status', 'acquisition_date')
    list_filter = ('equipment_type', 'status', 'acquisition_date')
    search_fields = ('name', 'serial_number', 'description')
    ordering = ('name', 'acquisition_date')
    date_hierarchy = 'acquisition_date'

@admin.register(Rental)
class RentalAdmin(admin.ModelAdmin):
    list_display = ('user', 'equipment', 'rental_date', 'due_date', 'return_date', 'status')
    list_filter = ('status', 'rental_date', 'due_date', 'return_date')
    search_fields = ('user__username', 'equipment__name', 'equipment__serial_number', 'notes')
    ordering = ('-rental_date',)
    date_hierarchy = 'rental_date'
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'equipment', 'approved_by', 'returned_to')

@admin.register(RentalRequest)
class RentalRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'request_type', 'equipment', 'requested_date', 'status', 'processed_by', 'processed_at')
    list_filter = ('request_type', 'status', 'requested_date', 'processed_at')
    search_fields = ('user__username', 'equipment__name', 'reason')
    ordering = ('-requested_date',)
    date_hierarchy = 'requested_date'
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'equipment', 'rental', 'processed_by')
