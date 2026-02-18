from django.urls import path
from .views import ThresholdListView, ThresholdDetailView, AlarmListView, AlarmDetailView

urlpatterns = [
    path('thresholds/', ThresholdListView.as_view(), name='threshold-list'),
    path('thresholds/<int:id>/', ThresholdDetailView.as_view(), name='threshold-detail'),
    path('alarms/', AlarmListView.as_view(), name='alarm-list'),
    path('alarms/<int:id>/', AlarmDetailView.as_view(), name='alarm-detail'),
]
