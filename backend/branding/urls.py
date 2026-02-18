from django.urls import path
from .views import BrandingView

app_name = 'branding'

urlpatterns = [
    path('', BrandingView.as_view(), name='branding'),
]
