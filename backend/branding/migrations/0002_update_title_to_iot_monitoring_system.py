# Data migration: Update branding title from "IoT Energy Monitoring System" to "IoT Monitoring System"

from django.db import migrations


def update_title(apps, schema_editor):
    Branding = apps.get_model('branding', 'Branding')
    Branding.objects.filter(title='IoT Energy Monitoring System').update(title='IoT Monitoring System')


def reverse_update(apps, schema_editor):
    Branding = apps.get_model('branding', 'Branding')
    Branding.objects.filter(title='IoT Monitoring System').update(title='IoT Energy Monitoring System')


class Migration(migrations.Migration):

    dependencies = [
        ('branding', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(update_title, reverse_update),
    ]
