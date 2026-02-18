"""
Test script to verify MQTT topic matching logic.
Run: python manage.py test_mqtt_matching --topic EM/ED5432
"""
from django.core.management.base import BaseCommand
from devices.models import Device


class Command(BaseCommand):
    help = 'Test MQTT topic matching logic'

    def add_arguments(self, parser):
        parser.add_argument('--topic', type=str, required=True, help='MQTT topic to test (e.g., EM/ED5432)')

    def handle(self, *args, **options):
        topic = options['topic']
        
        self.stdout.write(f'\nTesting topic matching for: {topic}\n')
        self.stdout.write('=' * 60)
        
        # List all active devices
        devices = Device.objects.filter(is_active=True)
        self.stdout.write(f'\nActive devices ({devices.count()}):')
        for device in devices:
            self.stdout.write(f'  - {device.name} (ID: {device.id})')
            self.stdout.write(f'    Hardware Address: {device.hardware_address}')
            self.stdout.write(f'    MQTT Topic Pattern: {device.mqtt_topic_pattern or "Not set"}')
            self.stdout.write(f'    MQTT Broker: {device.mqtt_broker_host or "Not set"}:{device.mqtt_broker_port or "Not set"}')
            self.stdout.write('')
        
        # Try matching strategies
        self.stdout.write('\nMatching Strategies:')
        self.stdout.write('-' * 60)
        
        # Strategy 1: Exact topic pattern match
        device = Device.objects.filter(
            mqtt_topic_pattern=topic,
            is_active=True
        ).first()
        if device:
            self.stdout.write(self.style.SUCCESS(f'✓ Strategy 1 (Exact topic pattern): MATCHED - {device.name}'))
        else:
            self.stdout.write(self.style.WARNING('✗ Strategy 1 (Exact topic pattern): No match'))
        
        # Strategy 2: Extract hardware address from topic
        if '/' in topic:
            parts = topic.split('/', 1)
            potential_hw = parts[-1]
            device = Device.objects.filter(
                hardware_address=potential_hw,
                is_active=True
            ).first()
            if device:
                self.stdout.write(self.style.SUCCESS(f'✓ Strategy 2 (Hardware address extraction): MATCHED - {device.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'✗ Strategy 2 (Hardware address extraction): No match (extracted: {potential_hw})'))
        
        # Strategy 3: Partial match - topic ends with hardware address
        for d in Device.objects.filter(is_active=True):
            if topic.endswith(d.hardware_address):
                self.stdout.write(self.style.SUCCESS(f'✓ Strategy 3 (Suffix match): MATCHED - {d.name} (hardware_address: {d.hardware_address})'))
                break
        else:
            self.stdout.write(self.style.WARNING('✗ Strategy 3 (Suffix match): No match'))
        
        # Strategy 4: Check if any device has topic pattern that matches
        for d in Device.objects.filter(is_active=True, mqtt_topic_pattern__isnull=False).exclude(mqtt_topic_pattern=''):
            pattern = d.mqtt_topic_pattern
            if pattern == topic:
                self.stdout.write(self.style.SUCCESS(f'✓ Strategy 4 (Pattern match): MATCHED - {d.name}'))
                break
            elif pattern.endswith('+') and topic.startswith(pattern[:-1]):
                self.stdout.write(self.style.SUCCESS(f'✓ Strategy 4 (Wildcard match): MATCHED - {d.name}'))
                break
        else:
            self.stdout.write(self.style.WARNING('✗ Strategy 4 (Pattern match): No match'))
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('\nRecommendation:')
        if not device:
            self.stdout.write(self.style.ERROR(
                f'No device matched topic "{topic}". '
                f'Please set mqtt_topic_pattern="{topic}" for the correct device.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(f'Device "{device.name}" will receive data from topic "{topic}"'))
