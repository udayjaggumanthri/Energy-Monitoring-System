"""
Module 4: 15-day data retention.
Deletes DeviceData older than 15 days. Run daily via cron:
  python manage.py cleanup_old_device_data
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from devices.models import DeviceData


class Command(BaseCommand):
    help = 'Delete device data older than 15 days (retention policy).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=15,
            help='Retention period in days (default: 15)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only report how many rows would be deleted',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(days=days)

        qs = DeviceData.objects.filter(timestamp__lt=cutoff)
        count = qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS(f'No device data older than {days} days.'))
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'Would delete {count} device data record(s) older than {days} days.')
            )
            return

        qs.delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {count} device data record(s) older than {days} days.'))
