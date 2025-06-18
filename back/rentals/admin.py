from django.contrib import admin
from .models import Equipment, Rental, RentalRequest, EquipmentHistory

@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ['asset_number', 'manufacturer', 'model_name', 'equipment_type', 'status', 'acquisition_date']
    list_filter = ['equipment_type', 'status', 'acquisition_date']
    search_fields = ['asset_number', 'manufacturer', 'model_name', 'serial_number']
    ordering = ['asset_number']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Rental)
class RentalAdmin(admin.ModelAdmin):
    list_display = ('user', 'equipment', 'rental_date', 'due_date', 'return_date', 'status')
    list_filter = ('status', 'rental_date', 'due_date', 'return_date')
    search_fields = ('user__username', 'equipment__asset_number', 'equipment__serial_number', 'notes')
    ordering = ('-rental_date',)
    date_hierarchy = 'rental_date'
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'equipment', 'approved_by', 'returned_to')

@admin.register(RentalRequest)
class RentalRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'request_type', 'equipment', 'requested_date', 'status', 'processed_by', 'processed_date')
    list_filter = ('request_type', 'status', 'requested_date', 'processed_date')
    search_fields = ('user__username', 'equipment__asset_number', 'notes')
    ordering = ('-requested_date',)
    date_hierarchy = 'requested_date'
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user', 'equipment', 'processed_by')

@admin.register(EquipmentHistory)
class EquipmentHistoryAdmin(admin.ModelAdmin):
    list_display = ('equipment', 'action', 'user', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('equipment__asset_number', 'user__username', 'details')
    ordering = ('-created_at',)
    readonly_fields = ('equipment', 'action', 'old_value', 'new_value', 'user', 'details', 'created_at')
    date_hierarchy = 'created_at'
