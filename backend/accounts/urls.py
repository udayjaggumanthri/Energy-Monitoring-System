from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Authentication endpoints
    path('login/', views.LoginView.as_view(), name='login'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User management endpoints
    path('users/', views.UserListView.as_view(), name='users-list'),
    path('users/me/', views.CurrentUserView.as_view(), name='current-user'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
]
