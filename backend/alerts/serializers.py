from rest_framework import serializers
from devices.models import Threshold, Alarm


class ThresholdSerializer(serializers.ModelSerializer):
    """Module 5: Limit configuration per device and parameter."""
    device_id = serializers.IntegerField(source='device.id', read_only=True)

    class Meta:
        model = Threshold
        fields = ['id', 'device', 'device_id', 'parameter_key', 'min', 'max']
        read_only_fields = ['id']

    def validate_parameter_key(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('Parameter key is required (e.g. v, a, tkW).')
        if len(str(value).strip()) > 50:
            raise serializers.ValidationError('Parameter key must be 50 characters or fewer.')
        return str(value).strip()

    def validate_min(self, value):
        if value is not None and not isinstance(value, (int, float)):
            raise serializers.ValidationError('Minimum must be a number.')
        return value

    def validate_max(self, value):
        if value is not None and not isinstance(value, (int, float)):
            raise serializers.ValidationError('Maximum must be a number.')
        return value

    def validate(self, attrs):
        if attrs.get('min') is None and attrs.get('max') is None:
            raise serializers.ValidationError(
                {'non_field_errors': ['Set at least a minimum or maximum limit.']}
            )
        min_val, max_val = attrs.get('min'), attrs.get('max')
        if min_val is not None and max_val is not None and min_val > max_val:
            raise serializers.ValidationError(
                {'non_field_errors': ['Minimum cannot be greater than maximum.']}
            )
        return attrs


class AlarmSerializer(serializers.ModelSerializer):
    """Module 5: Breach event - read and acknowledge."""
    device_id = serializers.IntegerField(source='device.id', read_only=True)
    device_name = serializers.CharField(source='device.name', read_only=True)

    class Meta:
        model = Alarm
        fields = [
            'id', 'device', 'device_id', 'device_name',
            'parameter_key', 'parameter_label', 'value', 'threshold', 'type',
            'timestamp', 'acknowledged'
        ]
        read_only_fields = [
            'id', 'device', 'parameter_key', 'parameter_label', 'value',
            'threshold', 'type', 'timestamp'
        ]
