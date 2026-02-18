from django.contrib import admin
from .models import Device, ParameterMapping, DeviceData


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = [
        'hardware_address', 'name', 'area', 'building', 'floor',
        'is_active', 'created_at', 'last_data_received'
    ]
    list_filter = ['is_active', 'area', 'building', 'floor', 'created_at']
    search_fields = ['hardware_address', 'name', 'description']
    filter_horizontal = ['assigned_users']
    readonly_fields = ['created_at', 'updated_at', 'last_data_received']
    
    fieldsets = (
        ('Device Information', {
            'fields': ('hardware_address', 'name', 'description', 'is_active')
        }),
        ('Location', {
            'fields': ('area', 'building', 'floor')
        }),
        ('User Assignment', {
            'fields': ('assigned_users',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_data_received')
        }),
    )


@admin.register(ParameterMapping)
class ParameterMappingAdmin(admin.ModelAdmin):
    list_display = ['hardware_key', 'ui_label', 'unit', 'created_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['hardware_key', 'ui_label', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DeviceData)
class DeviceDataAdmin(admin.ModelAdmin):
    list_display = ['device', 'timestamp', 'parameters_preview']
    list_filter = ['timestamp', 'device']
    search_fields = ['device__name', 'device__hardware_address']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    def parameters_preview(self, obj):
        """Show a preview of parameters"""
        import json
        params = json.dumps(obj.parameters)[:100]
        return params + '...' if len(json.dumps(obj.parameters)) > 100 else params
    parameters_preview.short_description = 'Parameters'
