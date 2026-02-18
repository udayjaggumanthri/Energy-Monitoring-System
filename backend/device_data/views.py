from datetime import datetime
from functools import reduce
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Q, Max
from django.utils import timezone as django_tz

from devices.models import Device, DeviceData
from devices.services import check_thresholds_and_create_alarms
from devices.utils import get_visible_devices_queryset
from core.pagination import DeviceDataListPagination
from .serializers import DeviceDataSerializer, DeviceDataIngestSerializer


def _parse_date_param(value):
    """Parse from_date/to_date query param to timezone-aware datetime. Date-only => start/end of day."""
    if not value or not value.strip():
        return None
    value = value.strip()
    try:
        if 'T' in value:
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        else:
            dt = datetime.strptime(value[:10], '%Y-%m-%d')
        if dt.tzinfo is None:
            dt = django_tz.make_aware(dt, django_tz.get_current_timezone())
        return dt
    except (ValueError, TypeError):
        return None


class DeviceDataCreateView(generics.CreateAPIView):
    """
    Create device data (for hardware / MQTT bridge).
    Accepts either "device" (id) or "hardware_address" (5-digit) + "parameters" (Module 4).
    """
    queryset = DeviceData.objects.all()
    serializer_class = DeviceDataIngestSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device_data = serializer.save()

        device = device_data.device
        device.last_data_received = device_data.timestamp
        device.save(update_fields=['last_data_received'])

        check_thresholds_and_create_alarms(device, device_data.parameters or {})

        return Response(
            {
                'message': 'Device data recorded successfully',
                'data': DeviceDataSerializer(device_data).data
            },
            status=status.HTTP_201_CREATED
        )


class DeviceDataListView(generics.ListAPIView):
    """
    List device data (historical data). Module 7: supports from_date, to_date for time-range filtering.
    """
    serializer_class = DeviceDataSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = DeviceDataListPagination

    def get_queryset(self):
        user = self.request.user
        device_id = self.request.query_params.get('device_id', None)
        from_date = self.request.query_params.get('from_date', None)
        to_date = self.request.query_params.get('to_date', None)

        if user.has_role('super_admin', 'admin'):
            queryset = DeviceData.objects.all()
        else:
            queryset = DeviceData.objects.filter(device__assigned_users=user)

        if device_id:
            queryset = queryset.filter(device_id=device_id)

        from_dt = _parse_date_param(from_date)
        to_dt = _parse_date_param(to_date)
        if from_dt:
            queryset = queryset.filter(timestamp__gte=from_dt)
        if to_dt:
            if 'T' not in (to_date or ''):
                to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
            queryset = queryset.filter(timestamp__lte=to_dt)

        if from_dt or to_dt:
            return queryset.select_related('device').order_by('timestamp')
        return queryset.select_related('device').order_by('-timestamp')


class DeviceDataLatestView(generics.GenericAPIView):
    """
    GET /api/device-data/latest/
    Returns latest parameters and timestamp per device for all devices the user can see.
    Used by the real-time dashboard (Module 3). Parameters capped at 20 keys per device.
    """
    permission_classes = [IsAuthenticated]

    def get_visible_device_ids(self):
        user = self.request.user
        if user.has_role('super_admin', 'admin'):
            return list(Device.objects.all().values_list('id', flat=True))
        return list(Device.objects.filter(assigned_users=user).values_list('id', flat=True))

    def get(self, request):
        device_ids = self.get_visible_device_ids()
        if not device_ids:
            return Response({})

        latest_ts = DeviceData.objects.filter(
            device_id__in=device_ids
        ).values('device_id').annotate(latest_ts=Max('timestamp'))

        pairs = [(row['device_id'], row['latest_ts']) for row in latest_ts]
        if not pairs:
            return Response({})

        q = reduce(lambda a, b: a | b, [Q(device_id=d, timestamp=t) for d, t in pairs], Q())
        rows = DeviceData.objects.filter(q).select_related('device')

        MAX_PARAMS = 20
        result = {}
        for row in rows:
            params = row.parameters if isinstance(row.parameters, dict) else {}
            items = list(params.items())[:MAX_PARAMS]
            result[str(row.device_id)] = {
                'parameters': dict(items),
                'timestamp': row.timestamp.isoformat() if row.timestamp else None,
            }
        return Response(result)
