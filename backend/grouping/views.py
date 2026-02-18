from collections import defaultdict
from functools import reduce
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Max

from devices.models import Device, DeviceData
from devices.utils import get_visible_devices_queryset


def _get_total_kw_from_parameters(parameters):
    """Extract Total kW from device parameters (tkW, tkw, total_kw, case-insensitive)."""
    if not parameters or not isinstance(parameters, dict):
        return 0.0
    for key, value in parameters.items():
        if key and isinstance(value, (int, float)):
            k = key.lower().replace('_', '')
            if k in ('tkw', 'totalkw', 'total_kw'):
                return float(value)
    return 0.0


class GroupingView(generics.GenericAPIView):
    """
    Module 6: GET /api/grouping/
    Returns hierarchical grouping (Area -> Building -> Floor) with device_ids and aggregated Total kW per group.
    Query param: aggregation=sum|avg (default sum).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        visible = get_visible_devices_queryset(request.user)
        device_ids = list(visible.values_list('id', flat=True))
        if not device_ids:
            return Response({'areas': []})

        devices = list(
            Device.objects.filter(id__in=device_ids).exclude(
                area__isnull=True
            ).exclude(area='').exclude(
                building__isnull=True
            ).exclude(building='').exclude(
                floor__isnull=True
            ).exclude(floor='').values('id', 'area', 'building', 'floor')
        )
        if not devices:
            return Response({'areas': []})

        latest_ts = DeviceData.objects.filter(
            device_id__in=device_ids
        ).values('device_id').annotate(latest_ts=Max('timestamp'))
        pairs = [(row['device_id'], row['latest_ts']) for row in latest_ts]
        params_by_device = {}
        if pairs:
            q = reduce(lambda a, b: a | b, [Q(device_id=d, timestamp=t) for d, t in pairs], Q())
            for row in DeviceData.objects.filter(q).values('device_id', 'parameters'):
                params_by_device[row['device_id']] = row.get('parameters') or {}

        aggregation = (request.query_params.get('aggregation') or 'sum').lower()
        if aggregation not in ('sum', 'avg'):
            aggregation = 'sum'

        groups = defaultdict(list)
        for d in devices:
            key = (d['area'], d['building'], d['floor'])
            total_kw = _get_total_kw_from_parameters(params_by_device.get(d['id']))
            groups[key].append((d['id'], total_kw))

        area_order = {}
        building_order = {}
        floor_order = {}
        for (area, building, floor) in groups:
            if area not in area_order:
                area_order[area] = len(area_order)
            if (area, building) not in building_order:
                building_order[(area, building)] = len(building_order)
            if (area, building, floor) not in floor_order:
                floor_order[(area, building, floor)] = len(floor_order)

        areas_list = []
        seen_areas = set()
        for (area, building, floor) in sorted(groups.keys(), key=lambda x: (area_order[x[0]], building_order[(x[0], x[1])], floor_order[x])):
            if area not in seen_areas:
                seen_areas.add(area)
                areas_list.append({
                    'name': area,
                    'buildings': []
                })
            area_entry = next(a for a in areas_list if a['name'] == area)

            building_entry = next((b for b in area_entry['buildings'] if b['name'] == building), None)
            if not building_entry:
                building_entry = {'name': building, 'floors': []}
                area_entry['buildings'].append(building_entry)

            device_ids_in_floor = []
            total_kw_values = []
            for dev_id, tw in groups[(area, building, floor)]:
                device_ids_in_floor.append(dev_id)
                total_kw_values.append(tw)

            if aggregation == 'avg' and total_kw_values:
                total_kw = sum(total_kw_values) / len(total_kw_values)
            else:
                total_kw = sum(total_kw_values)

            building_entry['floors'].append({
                'name': floor,
                'device_ids': device_ids_in_floor,
                'device_count': len(device_ids_in_floor),
                'total_kw': round(total_kw, 2),
            })

        return Response({'areas': areas_list})
