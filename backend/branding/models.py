from django.db import models
from django.conf import settings


class Branding(models.Model):
    """
    Singleton model for white-labeling: company title and logo.
    One row per deployment; use get_or_create(pk=1) in views.
    """
    title = models.CharField(
        max_length=200,
        default='IoT Monitoring System',
        help_text='System title shown in headers and login'
    )
    logo = models.ImageField(
        upload_to='branding/',
        blank=True,
        null=True,
        help_text='Company logo (web and mobile)'
    )

    class Meta:
        db_table = 'branding_branding'
        verbose_name = 'Branding'
        verbose_name_plural = 'Branding'


class WhiteLabel(models.Model):
    """
    Multi-tenant white-label configuration.
    Super Admin can create multiple configurations and assign them to Admins.
    Admin-created users inherit the same WhiteLabel.
    """
    name = models.CharField(
        max_length=120,
        unique=True,
        help_text='Internal name (e.g. company name) used to identify this white-label.'
    )
    title = models.CharField(
        max_length=200,
        default='IoT Monitoring System',
        help_text='System title shown in headers and sidebar'
    )
    logo = models.ImageField(
        upload_to='whitelabel/',
        blank=True,
        null=True,
        help_text='Company logo'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_whitelabels'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'branding_whitelabel'
        verbose_name = 'White Label'
        verbose_name_plural = 'White Labels'
        ordering = ['name']

    def __str__(self):
        return self.name
