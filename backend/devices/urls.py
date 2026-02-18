from django.urls import path
from .views import (
    DeviceListView,
    DeviceDetailView,
    ParameterMappingListView,
    ParameterMappingDetailView,
    MQTTTestView,
    MQTTDeviceRegistrationView,
    DeviceMQTTConfigView,
)

app_name = 'devices'

urlpatterns = [
    path('devices/', DeviceListView.as_view(), name='device-list'),
    path('devices/<int:id>/', DeviceDetailView.as_view(), name='device-detail'),
    path('devices/test-mqtt/', MQTTTestView.as_view(), name='mqtt-test'),
    path('devices/register-from-mqtt/', MQTTDeviceRegistrationView.as_view(), name='mqtt-device-registration'),
    path('devices/<int:id>/mqtt-config/', DeviceMQTTConfigView.as_view(), name='device-mqtt-config'),
    path('parameter-mappings/', ParameterMappingListView.as_view(), name='parameter-mapping-list'),
    path('parameter-mappings/<int:id>/', ParameterMappingDetailView.as_view(), name='parameter-mapping-detail'),
]
