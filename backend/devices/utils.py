"""Shared helpers for device visibility (used by device_data, alerts, grouping)."""
from .models import Device


def get_visible_devices_queryset(user):
    """Same visibility as device list: super_admin/admin see all, user sees assigned only."""
    if user.has_role('super_admin', 'admin'):
        return Device.objects.all()
    return Device.objects.filter(assigned_users=user)
