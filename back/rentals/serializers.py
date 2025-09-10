from rest_framework import serializers
from .models import Equipment, Rental, RentalRequest, EquipmentMacAddress, EquipmentHistory
from django.contrib.auth import get_user_model
import logging

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'name']
    
    def get_name(self, obj):
        # 성과 이름이 모두 있는 경우
        if obj.last_name and obj.first_name:
            return f"{obj.last_name} {obj.first_name}"
        # 성만 있는 경우
        elif obj.last_name:
            return obj.last_name
        # 이름만 있는 경우
        elif obj.first_name:
            return obj.first_name
        # 둘 다 없는 경우 사용자명 사용
        else:
            return obj.username


class EquipmentMacAddressSerializer(serializers.ModelSerializer):
    interface_type_display = serializers.CharField(source='get_interface_type_display', read_only=True)
    
    class Meta:
        model = EquipmentMacAddress
        fields = ['id', 'mac_address', 'interface_type', 'interface_type_display', 'is_primary']
        read_only_fields = ['id']


class EmptyStringToNoneDateTimeField(serializers.DateTimeField):
    def to_internal_value(self, value):
        if value == '' or value is None:
            return None
        return super().to_internal_value(value)


class EquipmentHistorySerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    equipment_info = serializers.SerializerMethodField()
    
    class Meta:
        model = EquipmentHistory
        fields = ['id', 'equipment', 'equipment_info', 'action', 'action_display', 'old_value', 'new_value', 'user', 'details', 'created_at']
        read_only_fields = fields
    
    def get_user(self, obj):
        if not obj.user:
            return None
        
        # 사용자 이름 처리
        last_name = str(obj.user.last_name or '').strip()
        first_name = str(obj.user.first_name or '').strip()
        
        # 이름이 모두 비어있는 경우 사용자 아이디 사용
        if not last_name and not first_name:
            full_name = obj.user.username
        else:
            # 성과 이름이 있는 경우에만 공백 추가
            full_name = f"{last_name} {first_name}".strip()
        
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'name': full_name,
            'email': obj.user.email,
            'is_staff': obj.user.is_staff
        }
    
    def get_equipment_info(self, obj):
        return {
            'id': obj.equipment.id,
            'asset_number': obj.equipment.asset_number,
            'model_name': obj.equipment.model_name
        }


class EquipmentSerializer(serializers.ModelSerializer):
    equipment_type_display = serializers.CharField(source='get_equipment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    mac_addresses = EquipmentMacAddressSerializer(many=True, required=False)
    rental = serializers.SerializerMethodField()
    purchase_date = serializers.DateField(required=False, allow_null=True)
    acquisition_date = serializers.DateField(required=False, allow_null=True)
    manufacture_year = serializers.IntegerField(required=False, allow_null=True)
    purchase_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    
    class Meta:
        model = Equipment
        fields = [
            'id', 'asset_number', 'manufacturer', 'model_name', 'equipment_type',
            'equipment_type_display', 'serial_number', 'mac_addresses',
            'description', 'status', 'status_display', 'acquisition_date',
            'manufacture_year', 'purchase_date', 'rental', 'management_number', 'purchase_price',
            'created_at'
        ]
        read_only_fields = ['management_number']
    
    def get_rental(self, obj):
        if hasattr(obj, 'current_rentals') and obj.current_rentals:
            rental = obj.current_rentals[0]  # 가장 최근 대여 정보
            user = rental.user
            
            # 사용자 이름 처리
            last_name = str(user.last_name or '').strip()
            first_name = str(user.first_name or '').strip()
            
            # 이름이 모두 비어있는 경우 사용자 아이디 사용
            if not last_name and not first_name:
                full_name = user.username
            else:
                # 성과 이름이 있는 경우에만 공백 추가
                full_name = f"{last_name} {first_name}".strip()
            
            return {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'name': full_name
                },
                'due_date': rental.due_date,
                'rental_date': rental.rental_date,
                'id': rental.id  # 대여 ID 추가
            }
        return None
    
    def create(self, validated_data):
        """장비 생성 시 날짜 필드 처리"""
        # purchase_date 처리
        purchase_date = validated_data.get('purchase_date')
        if isinstance(purchase_date, str):
            try:
                from datetime import datetime
                # YYYY-MM-DD 형식으로 파싱 (date 객체로 반환)
                if purchase_date.strip():  # 빈 문자열이 아닌 경우에만 처리
                    validated_data['purchase_date'] = datetime.strptime(purchase_date, '%Y-%m-%d').date()
                else:
                    validated_data['purchase_date'] = None
            except (ValueError, TypeError):
                validated_data['purchase_date'] = None
        elif hasattr(purchase_date, 'date'):  # datetime 객체인 경우
            validated_data['purchase_date'] = purchase_date.date()
        
        # acquisition_date 처리
        acquisition_date = validated_data.get('acquisition_date')
        if isinstance(acquisition_date, str):
            try:
                from datetime import datetime
                # YYYY-MM-DD 형식으로 파싱 (date 객체로 반환)
                if acquisition_date.strip():  # 빈 문자열이 아닌 경우에만 처리
                    validated_data['acquisition_date'] = datetime.strptime(acquisition_date, '%Y-%m-%d').date()
                else:
                    validated_data['acquisition_date'] = None
            except (ValueError, TypeError):
                validated_data['acquisition_date'] = None
        elif hasattr(acquisition_date, 'date'):  # datetime 객체인 경우
            validated_data['acquisition_date'] = acquisition_date.date()
        
        # MAC 주소 데이터 추출
        mac_addresses_data = validated_data.pop('mac_addresses', [])
        
        # 장비 생성
        equipment = Equipment.objects.create(**validated_data)
        
        # MAC 주소 생성
        for mac_data in mac_addresses_data:
            EquipmentMacAddress.objects.create(equipment=equipment, **mac_data)
        
        return equipment
    
    def update(self, instance, validated_data):
        """장비 수정 시 날짜 필드 처리"""
        # purchase_date 처리
        purchase_date = validated_data.get('purchase_date')
        if isinstance(purchase_date, str):
            try:
                from datetime import datetime
                # YYYY-MM-DD 형식으로 파싱 (date 객체로 반환)
                if purchase_date.strip():  # 빈 문자열이 아닌 경우에만 처리
                    validated_data['purchase_date'] = datetime.strptime(purchase_date, '%Y-%m-%d').date()
                else:
                    validated_data['purchase_date'] = None
            except (ValueError, TypeError):
                validated_data['purchase_date'] = None
        elif hasattr(purchase_date, 'date'):  # datetime 객체인 경우
            validated_data['purchase_date'] = purchase_date.date()
        
        # acquisition_date 처리
        acquisition_date = validated_data.get('acquisition_date')
        if isinstance(acquisition_date, str):
            try:
                from datetime import datetime
                # YYYY-MM-DD 형식으로 파싱 (date 객체로 반환)
                if acquisition_date.strip():  # 빈 문자열이 아닌 경우에만 처리
                    validated_data['acquisition_date'] = datetime.strptime(acquisition_date, '%Y-%m-%d').date()
                else:
                    validated_data['acquisition_date'] = None
            except (ValueError, TypeError):
                validated_data['acquisition_date'] = None
        elif hasattr(acquisition_date, 'date'):  # datetime 객체인 경우
            validated_data['acquisition_date'] = acquisition_date.date()
        
        # MAC 주소 데이터 추출
        mac_addresses_data = validated_data.pop('mac_addresses', None)
        
        # 장비 업데이트
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # MAC 주소 업데이트 (제공된 경우)
        if mac_addresses_data is not None:
            # 기존 MAC 주소 삭제
            instance.mac_addresses.all().delete()
            # 새로운 MAC 주소 생성
            for mac_data in mac_addresses_data:
                EquipmentMacAddress.objects.create(equipment=instance, **mac_data)
        
        return instance

    def validate_purchase_date(self, value):
        if value == '' or value is None:
            return None
        return value

    def validate_manufacture_year(self, value):
        if value == '':
            return None
        return value

    def validate_purchase_price(self, value):
        if value == '':
            return None
        return value


class EquipmentLiteSerializer(serializers.ModelSerializer):
    """장비 정보의 간소화된 버전 (성능 최적화용)"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    equipment_type_display = serializers.CharField(source='get_equipment_type_display', read_only=True)
    mac_addresses = EquipmentMacAddressSerializer(many=True, read_only=True)
    rental = serializers.SerializerMethodField()
    
    class Meta:
        model = Equipment
        fields = [
            'id', 'asset_number', 'manufacturer', 'model_name', 'equipment_type', 'equipment_type_display', 'serial_number', 
            'mac_addresses', 'status', 'status_display', 'manufacture_year', 'purchase_date', 'rental', 'management_number',
            'created_at'
        ]
    
    def get_rental(self, obj):
        if hasattr(obj, 'current_rentals') and obj.current_rentals:
            rental = obj.current_rentals[0]  # 가장 최근 대여 정보
            user = rental.user
            
            # 사용자 이름 처리
            last_name = str(user.last_name or '').strip()
            first_name = str(user.first_name or '').strip()
            
            # 이름이 모두 비어있는 경우 사용자 아이디 사용
            if not last_name and not first_name:
                full_name = user.username
            else:
                # 성과 이름이 있는 경우에만 공백 추가
                full_name = f"{last_name} {first_name}".strip()
            
            return {
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'name': full_name
                },
                'due_date': rental.due_date,
                'rental_date': rental.rental_date,
                'id': rental.id  # 대여 ID 추가
            }
        return None


class PublicEquipmentSerializer(serializers.ModelSerializer):
    """공개 API용 장비 정보 시리얼라이저 - 민감한 정보 제외"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    equipment_type_display = serializers.CharField(source='get_equipment_type_display', read_only=True)
    
    class Meta:
        model = Equipment
        fields = [
            'id', 'asset_number', 'manufacturer', 'model_name', 'equipment_type', 
            'equipment_type_display', 'serial_number', 'description', 'status', 
            'status_display', 'acquisition_date', 'manufacture_year', 
            'purchase_date', 'purchase_price', 'management_number', 'created_at'
        ]


class PublicRentalSerializer(serializers.ModelSerializer):
    """공개 API용 대여 정보 시리얼라이저 - 사용자 정보 제한"""
    user_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Rental
        fields = [
            'id', 'rental_date', 'due_date', 'return_date', 'status', 
            'status_display', 'notes', 'user_name', 'created_at'
        ]
    
    def get_user_name(self, obj):
        """사용자 이름 반환 (개인정보 보호를 위해 이름만)"""
        user = obj.user
        last_name = str(user.last_name or '').strip()
        first_name = str(user.first_name or '').strip()
        
        if not last_name and not first_name:
            return user.username
        else:
            return f"{last_name} {first_name}".strip()


class PublicEquipmentHistorySerializer(serializers.ModelSerializer):
    """공개 API용 장비 이력 시리얼라이저"""
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = EquipmentHistory
        fields = [
            'id', 'action', 'action_display', 'details', 'created_at'
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
    pending_request = serializers.SerializerMethodField()

    class Meta:
        model = Rental
        fields = [
            'id', 'user', 'user_detail', 'equipment', 'equipment_detail', 
            'rental_date', 'due_date', 'return_date',
            'status', 'status_display', 'notes', 'approved_by', 'returned_to',
            'created_at', 'updated_at', 'pending_request'
        ]
        read_only_fields = ['approved_by', 'returned_to', 'created_at', 'updated_at']

    def get_pending_request(self, obj):
        """해당 장비에 대한 진행 중인 요청 정보 반환"""
        from .models import RentalRequest
        
        # 현재 대여와 같은 장비에 대한 진행 중인 요청 찾기
        # 장비와 사용자가 모두 일치하는 PENDING 상태의 요청
        pending_request = RentalRequest.objects.filter(
            equipment=obj.equipment,
            user=obj.user,
            status='PENDING'
        ).order_by('-requested_date').first()
        
        if pending_request:
            return {
                'id': pending_request.id,
                'request_type': pending_request.request_type,
                'request_type_display': pending_request.get_request_type_display(),
                'status': pending_request.status,
                'status_display': pending_request.get_status_display(),
                'requested_date': pending_request.requested_date,
                'request_reason': pending_request.request_reason
            }
        return None


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
            'request_reason', 'reject_reason', 'processed_by', 'processed_date', 'created_at'
        ]
        read_only_fields = ['user', 'processed_by', 'processed_date', 'created_at'] 