from rest_framework import serializers
from .models import Device, ParameterMapping
from accounts.serializers import UserListSerializer


class ParameterMappingSerializer(serializers.ModelSerializer):
    """Serializer for Parameter Mapping"""

    class Meta:
        model = ParameterMapping
        fields = [
            'id', 'hardware_key', 'ui_label', 'unit', 'description',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_hardware_key(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Hardware key is required (e.g. v, a, pf).')
        key = str(value).strip()
        if len(key) > 50:
            raise serializers.ValidationError('Hardware key must be 50 characters or fewer.')
        return key

    def validate_ui_label(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Display label is required (e.g. Voltage, Current).')
        if len(value.strip()) > 100:
            raise serializers.ValidationError('Display label must be 100 characters or fewer.')
        return value.strip()


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for Device model"""
    assigned_users = UserListSerializer(many=True, read_only=True)

    class Meta:
        model = Device
        fields = [
            'id', 'hardware_address', 'name', 'description',
            'area', 'building', 'floor',
            'is_active', 'assigned_users',
            'mqtt_broker_host', 'mqtt_broker_port', 'mqtt_topic_prefix',
            'mqtt_topic_pattern', 'mqtt_username', 'mqtt_use_tls',
            'mqtt_tls_ca_certs',
            'created_at', 'updated_at', 'last_data_received'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_data_received']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['assigned_user_ids'] = [
            user.id for user in instance.assigned_users.all()
        ]
        return representation

    def to_internal_value(self, data):
        # Make a copy to avoid mutating the original
        data = dict(data)
        assigned_user_ids = data.pop('assigned_user_ids', None)
        validated_data = super().to_internal_value(data)
        if assigned_user_ids is not None:
            validated_data['assigned_user_ids'] = assigned_user_ids
        return validated_data

    def create(self, validated_data):
        assigned_user_ids = validated_data.pop('assigned_user_ids', [])
        device = Device.objects.create(**validated_data)
        if assigned_user_ids:
            device.assigned_users.set(assigned_user_ids)
        return device

    def update(self, instance, validated_data):
        assigned_user_ids = validated_data.pop('assigned_user_ids', None)
        
        # Handle empty strings for optional fields - convert to None
        for attr, value in validated_data.items():
            # Convert empty strings to None for optional CharField fields
            if value == '' and attr in ['area', 'building', 'floor', 'description', 
                                       'mqtt_broker_host', 'mqtt_topic_pattern', 
                                       'mqtt_topic_prefix', 'mqtt_username']:
                setattr(instance, attr, None)
            else:
                setattr(instance, attr, value)
        
        instance.save()
        if assigned_user_ids is not None:
            instance.assigned_users.set(assigned_user_ids)
        return instance

    def validate_hardware_address(self, value):
        if not value:
            raise serializers.ValidationError('Hardware address is required.')
        raw = str(value).strip()
        if not raw.isdigit() or len(raw) != 5:
            raise serializers.ValidationError(
                'Hardware address must be exactly 5 digits (e.g. 46542).'
            )
        return raw

    def validate_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Device name is required.')
        if len(value.strip()) > 200:
            raise serializers.ValidationError('Device name must be 200 characters or fewer.')
        return value.strip()


class DeviceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing devices"""
    assigned_users_count = serializers.IntegerField(
        source='assigned_users.count',
        read_only=True
    )

    class Meta:
        model = Device
        fields = [
            'id', 'hardware_address', 'name', 'area', 'building', 'floor',
            'is_active', 'assigned_users_count',
            'mqtt_broker_host', 'mqtt_broker_port', 'mqtt_topic_prefix',
            'mqtt_topic_pattern', 'mqtt_username', 'mqtt_use_tls',
            'created_at', 'last_data_received'
        ]
        read_only_fields = ['id', 'created_at', 'last_data_received']


class MQTTConfigSerializer(serializers.Serializer):
    """Serializer for MQTT configuration"""
    mqtt_broker_host = serializers.CharField(max_length=255, required=True)
    mqtt_broker_port = serializers.IntegerField(default=1883, min_value=1, max_value=65535)
    mqtt_topic_prefix = serializers.CharField(max_length=100, required=True, allow_blank=False)
    mqtt_topic_pattern = serializers.CharField(max_length=255, required=False, allow_blank=True)
    mqtt_username = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    mqtt_password = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True, write_only=True)
    mqtt_use_tls = serializers.BooleanField(default=False)
    mqtt_tls_ca_certs = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class MQTTTestSerializer(serializers.Serializer):
    """Serializer for MQTT connection testing"""
    mqtt_broker_host = serializers.CharField(max_length=255, required=True)
    mqtt_broker_port = serializers.IntegerField(default=1883, min_value=1, max_value=65535)
    mqtt_topic_prefix = serializers.CharField(max_length=100, required=True, allow_blank=False)
    mqtt_username = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    mqtt_password = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True, write_only=True)
    mqtt_use_tls = serializers.BooleanField(default=False)
    mqtt_tls_ca_certs = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    timeout_seconds = serializers.IntegerField(default=15, min_value=5, max_value=60)
    
    def validate_mqtt_broker_host(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('MQTT broker host is required.')
        return value.strip()
    
    def validate_mqtt_topic_prefix(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('MQTT topic prefix is required.')
        # Basic MQTT topic validation (no # or + at the start for prefix)
        prefix = value.strip()
        if prefix.startswith('#') or prefix.startswith('+'):
            raise serializers.ValidationError('Topic prefix cannot start with # or +.')
        return prefix


class MQTTDeviceRegistrationSerializer(serializers.Serializer):
    """Serializer for registering device from MQTT test results"""
    hardware_address = serializers.CharField(max_length=5, required=True)
    name = serializers.CharField(max_length=200, required=True)
    area = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    building = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    floor = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    mqtt_config = MQTTConfigSerializer(required=True)
    field_mappings = serializers.DictField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text='Mapping of parameter keys to parameter mapping IDs'
    )
    
    def validate_hardware_address(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Hardware address is required.')
        raw = str(value).strip()
        if not raw.isdigit() or len(raw) != 5:
            raise serializers.ValidationError('Hardware address must be exactly 5 digits.')
        return raw
    
    def validate_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Device name is required.')
        if len(value.strip()) > 200:
            raise serializers.ValidationError('Device name must be 200 characters or fewer.')
        return value.strip()
    
    def validate_field_mappings(self, value):
        """Validate that field mapping IDs exist"""
        if not value:
            return {}
        from .models import ParameterMapping
        mapping_ids = list(value.values())
        existing_mappings = ParameterMapping.objects.filter(id__in=mapping_ids).values_list('id', flat=True)
        missing_ids = set(mapping_ids) - set(existing_mappings)
        if missing_ids:
            raise serializers.ValidationError(f'Parameter mapping IDs not found: {list(missing_ids)}')
        return value
