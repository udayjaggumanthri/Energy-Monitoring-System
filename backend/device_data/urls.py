from django.urls import path
from .views import DeviceDataCreateView, DeviceDataListView, DeviceDataLatestView

urlpatterns = [
    path('device-data/', DeviceDataCreateView.as_view(), name='device-data-create'),
    path('device-data/list/', DeviceDataListView.as_view(), name='device-data-list'),
    path('device-data/latest/', DeviceDataLatestView.as_view(), name='device-data-latest'),
]
