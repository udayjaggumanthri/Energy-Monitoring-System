"""
Django management command to create a Super Admin user.
Usage: python manage.py createsuperadmin
"""
from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = 'Creates a Super Admin user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username for the Super Admin',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email for the Super Admin',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for the Super Admin',
        )
        parser.add_argument(
            '--noinput',
            action='store_true',
            help='Run in non-interactive mode',
        )

    def handle(self, *args, **options):
        if options['noinput']:
            username = options.get('username') or 'superadmin'
            email = options.get('email') or 'superadmin@example.com'
            password = options.get('password') or 'password'
        else:
            username = options.get('username') or input('Username: ')
            email = options.get('email') or input('Email: ')
            password = options.get('password') or input('Password: ')

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'User "{username}" already exists.')
            )
            return

        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'User with email "{email}" already exists.')
            )
            return

        # Create Super Admin
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        user.role = 'super_admin'
        user.is_staff = True
        user.is_superuser = True
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created Super Admin: {username} ({email})'
            )
        )
