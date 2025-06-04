from rest_framework import serializers
from .models import Equipment, Rental, RentalRequest, EquipmentMacAddress
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'name']
    
    def get_name(self, obj):
        if obj.last_name:
            return obj.last_name
        return obj.username


class EquipmentMacAddressSerializer(serializers.ModelSerializer):
    interface_type_display = serializers.CharField(source='get_interface_type_display', read_only=True)
    
    class Meta:
        model = EquipmentMacAddress
        fields = ['id', 'mac_address', 'interface_type', 'interface_type_display', 'is_primary']
        read_only_fields = ['id']


class EquipmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    equipment_type_display = serializers.CharField(source='get_equipment_type_display', read_only=True)
    mac_addresses = EquipmentMacAddressSerializer(many=True, required=False)
    rental = serializers.SerializerMethodField()
    
    class Meta:
        model = Equipment
        fields = [
            'id', 'name', 'manufacturer', 'model_name', 'equipment_type', 
            'equipment_type_display', 'serial_number', 'mac_addresses',
            'description', 'status', 'status_display', 'acquisition_date', 
            'manufacture_year', 'purchase_date',
            'created_at', 'updated_at', 'rental'
        ]
    
    def get_rental(self, obj):
        rental = obj.rentals.filter(status='RENTED').first()
        if rental and rental.user:
            return {
                'user': UserSerializer(rental.user).data
            }
        return None
    
    def create(self, validated_data):
        # 시리얼 번호 중복 체크
        serial_number = validated_data.get('serial_number')
        if serial_number:
            try:
                existing_equipment = Equipment.objects.get(serial_number=serial_number)
                raise serializers.ValidationError({
                    'serial_number': '이미 등록된 시리얼 번호입니다.',
                    'existing_equipment': {
                        'id': existing_equipment.id,
                        'name': existing_equipment.name,
                        'equipment_type': existing_equipment.get_equipment_type_display(),
                        'status': existing_equipment.get_status_display(),
                        'rental': self.get_rental(existing_equipment)
                    }
                })
            except Equipment.DoesNotExist:
                pass

        mac_addresses_data = validated_data.pop('mac_addresses', [])
        equipment = Equipment.objects.create(**validated_data)
        
        for mac_data in mac_addresses_data:
            EquipmentMacAddress.objects.create(equipment=equipment, **mac_data)
        
        return equipment


class EquipmentLiteSerializer(serializers.ModelSerializer):
    """장비 정보의 간소화된 버전 (성능 최적화용)"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    mac_addresses = EquipmentMacAddressSerializer(many=True, read_only=True)
    
    class Meta:
        model = Equipment
        fields = [
            'id', 'name', 'manufacturer', 'model_name', 'serial_number', 
            'mac_addresses', 'status', 'status_display', 'manufacture_year', 'purchase_date'
        ]


class RentalSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=True
    )
    user_detail = UserSerializer(source='user', read_only=True)
    equipment = serializers.PrimaryKeyRelatedField(
        queryset=Equipment.objects.all(),
        required=True
    )
    equipment_detail = EquipmentSerializer(source='equipment', read_only=True)
    approved_by = UserSerializer(read_only=True)
    returned_to = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Rental
        fields = [
            'id', 'user', 'user_detail', 'equipment', 'equipment_detail', 
            'rental_date', 'due_date', 'return_date',
            'status', 'status_display', 'notes', 'approved_by', 'returned_to',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['approved_by', 'returned_to', 'created_at', 'updated_at']


class RentalRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    equipment = serializers.PrimaryKeyRelatedField(
        queryset=Equipment.objects.all()
    )
    equipment_detail = EquipmentSerializer(source='equipment', read_only=True)
    processed_by = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    request_type_display = serializers.CharField(source='get_request_type_display', read_only=True)

    class Meta:
        model = RentalRequest
        fields = [
            'id', 'user', 'equipment', 'equipment_detail', 'request_type', 'request_type_display',
            'requested_date', 'expected_return_date', 'status', 'status_display',
            'request_reason', 'reject_reason', 'processed_by', 'processed_at', 'created_at'
        ]
        read_only_fields = ['user', 'processed_by', 'processed_at', 'created_at'] 