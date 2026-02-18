from django.db import models
from django.core.validators import RegexValidator
from accounts.models import User


class Device(models.Model):
    """
    Device Model - Represents IoT energy monitoring devices
    Hardware Address: 5-digit unique identifier (e.g., 465421)
    """
    hardware_address_validator = RegexValidator(
        regex=r'^\d{5}$',
        message='Hardware address must be exactly 5 digits'
    )
    
    hardware_address = models.CharField(
        max_length=5,
        validators=[hardware_address_validator],
        unique=True,
        help_text='5-digit hardware back-address (e.g., 465421)'
    )
    name = models.CharField(
        max_length=200,
        help_text='User-friendly name for the device'
    )
    description = models.TextField(blank=True, null=True)
    
    # Hierarchical grouping (Module 4)
    area = models.CharField(max_length=100, blank=True, null=True)
    building = models.CharField(max_length=100, blank=True, null=True)
    floor = models.CharField(max_length=100, blank=True, null=True)
    
    # Device status
    is_active = models.BooleanField(default=True)
    
    # User assignment (Many-to-Many relationship)
    assigned_users = models.ManyToManyField(
        User,
        related_name='assigned_devices',
        blank=True,
        help_text='Users who have access to this device'
    )
    
    # MQTT Configuration (per-device)
    mqtt_broker_host = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='MQTT broker host (e.g., localhost, broker.example.com)'
    )
    mqtt_broker_port = models.IntegerField(
        default=1883,
        help_text='MQTT broker port (default: 1883)'
    )
    mqtt_topic_prefix = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='MQTT topic prefix (e.g., EM, iot/devices)'
    )
    mqtt_topic_pattern = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='Specific MQTT topic pattern for this device (e.g., EM/46521)'
    )
    mqtt_username = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='MQTT broker username (optional)'
    )
    mqtt_password = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text='MQTT broker password (optional, encrypted)'
    )
    mqtt_use_tls = models.BooleanField(
        default=False,
        help_text='Use TLS/SSL for MQTT connection'
    )
    mqtt_tls_ca_certs = models.TextField(
        blank=True,
        null=True,
        help_text='TLS CA certificate path or content (optional)'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_data_received = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'devices'
        verbose_name = 'Device'
        verbose_name_plural = 'Devices'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['hardware_address']),
            models.Index(fields=['is_active']),
            models.Index(fields=['area', 'building', 'floor']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.hardware_address})"


class ParameterMapping(models.Model):
    """
    Parameter Mapping Model - Maps hardware JSON keys to UI labels
    Example: {"v": "Voltage", "a": "Current"}
    Super Admin can configure these mappings
    """
    hardware_key = models.CharField(
        max_length=50,
        unique=True,
        help_text='Key sent by hardware (e.g., "v", "a", "pf")'
    )
    ui_label = models.CharField(
        max_length=100,
        help_text='Display label in UI (e.g., "Voltage", "Current")'
    )
    unit = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='Unit of measurement (e.g., "V", "A", "kW")'
    )
    description = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'parameter_mappings'
        verbose_name = 'Parameter Mapping'
        verbose_name_plural = 'Parameter Mappings'
        ordering = ['hardware_key']
    
    def __str__(self):
        return f"{self.hardware_key} → {self.ui_label}"


class DeviceData(models.Model):
    """
    Device Data Model - Stores real-time data from devices
    This will be used for historical data (Module 6)
    """
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='data_records'
    )
    parameters = models.JSONField(
        help_text='JSON data from device (e.g., {"v": 230, "a": 5})'
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'device_data'
        verbose_name = 'Device Data'
        verbose_name_plural = 'Device Data'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['device', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.device.name} - {self.timestamp}"


class Threshold(models.Model):
    """
    Module 5: Limit configuration per device and parameter.
    Admins set min/max; at least one must be set.
    """
    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='thresholds'
    )
    parameter_key = models.CharField(max_length=50, help_text='Hardware key (e.g. v, tkW)')
    min = models.FloatField(null=True, blank=True)
    max = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'thresholds'
        verbose_name = 'Threshold'
        verbose_name_plural = 'Thresholds'
        constraints = [
            models.UniqueConstraint(fields=['device', 'parameter_key'], name='unique_device_parameter')
        ]
        ordering = ['device', 'parameter_key']

    def __str__(self):
        return f"{self.device.name} / {self.parameter_key}"


class Alarm(models.Model):
    """
    Module 5: Breach event - created when device data exceeds threshold.
    Admin acknowledges; optional email sent on create.
    """
    TYPE_MIN = 'min'
    TYPE_MAX = 'max'
    TYPE_CHOICES = [(TYPE_MIN, 'min'), (TYPE_MAX, 'max')]

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name='alarms'
    )
    parameter_key = models.CharField(max_length=50)
    parameter_label = models.CharField(max_length=100)
    value = models.FloatField()
    threshold = models.FloatField(help_text='Limit that was breached')
    type = models.CharField(max_length=5, choices=TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_alarms'
    )

    class Meta:
        db_table = 'alarms'
        verbose_name = 'Alarm'
        verbose_name_plural = 'Alarms'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.device.name} {self.parameter_key} {self.type} breach"
