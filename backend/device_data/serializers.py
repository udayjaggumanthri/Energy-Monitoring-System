from rest_framework import serializers
from devices.models import Device, DeviceData


class DeviceDataSerializer(serializers.ModelSerializer):
    """Serializer for Device Data"""
    device_name = serializers.CharField(source='device.name', read_only=True)
    device_hardware_address = serializers.CharField(
        source='device.hardware_address',
        read_only=True
    )

    class Meta:
        model = DeviceData
        fields = [
            'id', 'device', 'device_name', 'device_hardware_address',
            'parameters', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class DeviceDataCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating device data (from hardware) - accepts device id + parameters"""

    class Meta:
        model = DeviceData
        fields = ['device', 'parameters']

    def validate_device(self, value):
        if not value.is_active:
            raise serializers.ValidationError('Device is not active')
        return value

    def validate_parameters(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Parameters must be a JSON object')
        return value


class DeviceDataIngestSerializer(serializers.Serializer):
    """
    Ingestion by device id OR hardware_address (Module 4 - MQTT topic alignment).
    Accepts either "device" (id) or "hardware_address" (5-digit) + "parameters".
    """
    hardware_address = serializers.CharField(required=False, max_length=5, allow_blank=True)
    device = serializers.PrimaryKeyRelatedField(queryset=Device.objects.all(), required=False)
    parameters = serializers.JSONField()

    def validate(self, attrs):
        has_hw = attrs.get('hardware_address')
        has_dev = attrs.get('device') is not None
        if has_hw and has_dev:
            raise serializers.ValidationError(
                {'non_field_errors': ['Provide either hardware_address or device, not both.']}
            )
        if not has_hw and not has_dev:
            raise serializers.ValidationError(
                {'non_field_errors': ['Provide either hardware_address or device.']}
            )
        if has_hw:
            hw = (attrs['hardware_address'] or '').strip()
            if not (hw.isdigit() and len(hw) == 5):
                raise serializers.ValidationError(
                    {'hardware_address': 'Hardware address must be exactly 5 digits.'}
                )
            device = Device.objects.filter(hardware_address=hw, is_active=True).first()
            if not device:
                raise serializers.ValidationError(
                    {'hardware_address': 'No active device with this hardware address.'}
                )
            attrs['device'] = device
        else:
            if not attrs['device'].is_active:
                raise serializers.ValidationError({'device': 'Device is not active.'})
        if not isinstance(attrs.get('parameters'), dict):
            raise serializers.ValidationError({'parameters': 'Parameters must be a JSON object.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('hardware_address', None)
        return DeviceData.objects.create(**validated_data)
