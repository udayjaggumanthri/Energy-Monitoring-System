from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User Model with Role-Based Access Control
    Roles: super_admin, admin, user
    """
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('user', 'User'),
    ]
    
    email = models.EmailField(unique=True, blank=True, null=True)
    mobile = models.CharField(max_length=15, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Tracks which admin / super admin created this user.
    # Used to scope visibility so that Admins only see users they created.
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_users',
    )

    # Multi-tenant branding / white-label assignment.
    # Super Admin assigns this to Admins; Admin-created users inherit it.
    white_label = models.ForeignKey(
        'branding.WhiteLabel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
    )
    
    # Note: assigned_devices will be added in Module 2 (Device Registration)
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_super_admin(self):
        return self.role == 'super_admin'
    
    @property
    def is_admin(self):
        return self.role == 'admin' or self.is_super_admin
    
    def has_role(self, *roles):
        """Check if user has any of the specified roles"""
        return self.role in roles
