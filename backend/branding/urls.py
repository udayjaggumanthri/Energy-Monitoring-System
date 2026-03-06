from django.urls import path
from .views import BrandingView, WhiteLabelListCreateView, WhiteLabelDetailView

app_name = 'branding'

urlpatterns = [
    path('', BrandingView.as_view(), name='branding'),
    path('whitelabels/', WhiteLabelListCreateView.as_view(), name='whitelabel-list'),
    path('whitelabels/<int:pk>/', WhiteLabelDetailView.as_view(), name='whitelabel-detail'),
]
