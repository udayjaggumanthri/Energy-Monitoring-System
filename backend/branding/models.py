from django.db import models


class Branding(models.Model):
    """
    Singleton model for white-labeling: company title and logo.
    One row per deployment; use get_or_create(pk=1) in views.
    """
    title = models.CharField(
        max_length=200,
        default='IoT Energy Monitoring System',
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
