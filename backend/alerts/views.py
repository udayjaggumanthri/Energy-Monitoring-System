from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from devices.models import Threshold, Alarm
from devices.utils import get_visible_devices_queryset
from .serializers import ThresholdSerializer, AlarmSerializer


class ThresholdListView(generics.ListCreateAPIView):
    """Module 5: List/create thresholds. List filtered by visible devices; create Admin only."""
    serializer_class = ThresholdSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        visible = get_visible_devices_queryset(self.request.user)
        qs = Threshold.objects.filter(device__in=visible).select_related('device')
        device_id = self.request.query_params.get('device_id')
        if device_id:
            qs = qs.filter(device_id=device_id)
        return qs.order_by('device', 'parameter_key')

    def create(self, request, *args, **kwargs):
        if not request.user.has_role('super_admin', 'admin'):
            return Response(
                {'error': 'Permission denied', 'message': 'Only Admin or Super Admin can set thresholds.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)


class ThresholdDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Module 5: Retrieve/update/delete threshold. Write: Admin only."""
    serializer_class = ThresholdSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'id'

    def get_queryset(self):
        visible = get_visible_devices_queryset(self.request.user)
        return Threshold.objects.filter(device__in=visible).select_related('device')

    def update(self, request, *args, **kwargs):
        if not request.user.has_role('super_admin', 'admin'):
            return Response(
                {'error': 'Permission denied', 'message': 'Only Admin or Super Admin can update thresholds.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.has_role('super_admin', 'admin'):
            return Response(
                {'error': 'Permission denied', 'message': 'Only Admin or Super Admin can delete thresholds.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class AlarmListView(generics.ListAPIView):
    """Module 5: List alarms for visible devices. Filter by acknowledged, device_id."""
    serializer_class = AlarmSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        visible = get_visible_devices_queryset(self.request.user)
        qs = Alarm.objects.filter(device__in=visible).select_related('device')
        acknowledged = self.request.query_params.get('acknowledged')
        if acknowledged is not None:
            qs = qs.filter(acknowledged=acknowledged.lower() == 'true')
        device_id = self.request.query_params.get('device_id')
        if device_id:
            qs = qs.filter(device_id=device_id)
        return qs.order_by('-timestamp')


class AlarmDetailView(generics.RetrieveUpdateAPIView):
    """Module 5: Retrieve alarm; PATCH to acknowledge (Admin only)."""
    serializer_class = AlarmSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    lookup_url_kwarg = 'id'
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        visible = get_visible_devices_queryset(self.request.user)
        return Alarm.objects.filter(device__in=visible).select_related('device')

    def patch(self, request, *args, **kwargs):
        if not request.user.has_role('super_admin', 'admin'):
            return Response(
                {'error': 'Permission denied', 'message': 'Only Admin or Super Admin can acknowledge alarms.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance = self.get_object()
        if request.data.get('acknowledged') is True:
            instance.acknowledged = True
            instance.acknowledged_at = timezone.now()
            instance.acknowledged_by = request.user
            instance.save(update_fields=['acknowledged', 'acknowledged_at', 'acknowledged_by'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
