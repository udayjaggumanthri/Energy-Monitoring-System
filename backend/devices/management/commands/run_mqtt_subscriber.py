"""
Module 4: MQTT subscription and persistence.
Subscribes to MQTT topics for each active device and stores JSON payloads in DeviceData.
Supports per-device MQTT configuration or global configuration fallback.
Config: MQTT_BROKER_HOST (default localhost), MQTT_BROKER_PORT (default 1883), MQTT_TOPIC_PREFIX (default EM).
Run: python manage.py run_mqtt_subscriber
"""
import json
import logging
import os
import sys
import signal

import paho.mqtt.client as mqtt

from django.core.management.base import BaseCommand
from django.utils import timezone

from devices.models import Device, DeviceData
from devices.services import check_thresholds_and_create_alarms
from devices.mqtt_service import get_mqtt_connection_manager


logger = logging.getLogger(__name__)

DEFAULT_HOST = 'localhost'
DEFAULT_PORT = 1883
DEFAULT_PREFIX = 'EM'


class Command(BaseCommand):
    help = 'Subscribe to MQTT topics EM/{hardware_address} and persist device data (Module 4).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--host',
            type=str,
            default=os.environ.get('MQTT_BROKER_HOST', DEFAULT_HOST),
            help='MQTT broker host',
        )
        parser.add_argument(
            '--port',
            type=int,
            default=int(os.environ.get('MQTT_BROKER_PORT', DEFAULT_PORT)),
            help='MQTT broker port',
        )
        parser.add_argument(
            '--prefix',
            type=str,
            default=os.environ.get('MQTT_TOPIC_PREFIX', DEFAULT_PREFIX),
            help='Topic prefix (e.g. EM for EM/46521)',
        )

    def handle(self, *args, **options):
        host = options['host']
        port = options['port']
        prefix = options['prefix'].strip().rstrip('/')

        # Check if any devices have per-device MQTT configuration
        devices_with_mqtt = Device.objects.filter(
            is_active=True,
            mqtt_broker_host__isnull=False
        ).exclude(mqtt_broker_host='')
        
        if devices_with_mqtt.exists():
            # Use per-device MQTT configuration
            self.stdout.write(self.style.SUCCESS(
                f'Found {devices_with_mqtt.count()} device(s) with per-device MQTT configuration. '
                'Using per-device broker settings.'
            ))
            
            manager = get_mqtt_connection_manager()
            
            # Set up signal handlers for graceful shutdown (only in interactive mode)
            if hasattr(self, '_called_from_command_line') or sys.stdin.isatty():
                def signal_handler(sig, frame):
                    self.stdout.write(self.style.WARNING('\nShutting down MQTT subscribers...'))
                    manager.disconnect_all()
                    sys.exit(0)
                
                signal.signal(signal.SIGINT, signal_handler)
                signal.signal(signal.SIGTERM, signal_handler)
            
            # Subscribe to all devices
            manager.subscribe_all_devices()
            
            self.stdout.write(self.style.SUCCESS('MQTT subscribers started.'))
            if sys.stdin.isatty():
                self.stdout.write('Press Ctrl+C to stop.')
            
            # Keep running
            try:
                import time
                while True:
                    time.sleep(1)
            except (KeyboardInterrupt, SystemExit):
                if hasattr(self, '_called_from_command_line') or sys.stdin.isatty():
                    self.stdout.write(self.style.WARNING('\nShutting down MQTT subscribers...'))
                manager.disconnect_all()
                if sys.stdin.isatty():
                    sys.exit(0)
        else:
            # Fall back to global configuration (backward compatibility)
            self.stdout.write(
                f'No devices with per-device MQTT configuration found. '
                f'Using global configuration: {host}:{port}, topic prefix "{prefix}"'
            )
            
            addresses = list(
                Device.objects.filter(is_active=True).values_list('hardware_address', flat=True).distinct()
            )
            if not addresses:
                self.stdout.write(self.style.WARNING('No active devices; nothing to subscribe to.'))
                return

            # Subscribe to both exact topics and wildcard pattern
            topics = [f'{prefix}/{hw}' for hw in addresses]
            # Also subscribe to wildcard pattern to catch any device (including alphanumeric topics)
            wildcard_topic = f'{prefix}/+'
            if wildcard_topic not in topics:
                topics.append(wildcard_topic)
            self.stdout.write(f'Subscribing to {len(topics)} topic(s): {", ".join(topics[:5])}{"..." if len(topics) > 5 else ""}')
            self.stdout.write(self.style.WARNING(
                'Note: Using wildcard subscription to catch all topics. '
                'For best results, configure MQTT topic pattern for each device.'
            ))

            try:
                client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            except AttributeError:
                client = mqtt.Client()
            client.on_connect = self._on_connect(client, topics)
            client.on_message = self._on_message(prefix)
            client.on_disconnect = self._on_disconnect

            try:
                client.connect(host, port, 60)
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'MQTT connect failed: {e}'))
                sys.exit(1)

            client.loop_forever()

    def _on_connect(self, client, topics):
        def on_connect(client, userdata, flags, reason_code, properties=None):
            rc = getattr(reason_code, 'value', reason_code) if reason_code is not None else 0
            if rc != 0:
                self.stderr.write(self.style.ERROR(f'MQTT connection failed: {reason_code}'))
                return
            self.stdout.write(self.style.SUCCESS('Connected to MQTT broker.'))
            for t in topics:
                client.subscribe(t)
                self.stdout.write(f'Subscribed to {t}')
        return on_connect

    def _on_message(self, topic_prefix):
        def on_message(client, userdata, msg):
            try:
                topic = msg.topic
                logger.info(f'Received MQTT message on topic: {topic}')
                
                # First, try to find device by exact topic pattern match
                device = Device.objects.filter(
                    mqtt_topic_pattern=topic,
                    is_active=True
                ).first()
                
                # If not found by topic pattern, try to match by hardware address extraction
                if not device and topic_prefix:
                    parts = topic.split('/', 1)
                    if len(parts) > 1:
                        potential_hw = parts[-1]
                        # Try exact match first
                        device = Device.objects.filter(
                            hardware_address=potential_hw,
                            is_active=True
                        ).first()
                        
                        # If still not found and it's alphanumeric, try matching any device with this topic pattern
                        if not device:
                            # Check if any device has this topic pattern configured
                            device = Device.objects.filter(
                                mqtt_topic_pattern__isnull=False
                            ).exclude(mqtt_topic_pattern='').filter(
                                is_active=True
                            ).first()
                            # If found, check if topic matches the pattern (simple substring match)
                            if device and device.mqtt_topic_pattern:
                                if device.mqtt_topic_pattern in topic or topic.endswith(device.mqtt_topic_pattern.split('/')[-1]):
                                    pass  # Use this device
                                else:
                                    device = None
                
                # Last resort: try to match by extracting hardware address from topic
                if not device:
                    if topic_prefix:
                        parts = topic.split('/', 1)
                        hardware_address = parts[-1] if len(parts) > 1 else topic
                    else:
                        hardware_address = topic
                    
                    # Try to find device by hardware address
                    device = Device.objects.filter(
                        hardware_address=hardware_address,
                        is_active=True
                    ).first()
                    
                    # If hardware_address doesn't match exactly, try partial match
                    if not device and len(hardware_address) >= 3:
                        # Try to find device where hardware_address is contained in topic suffix
                        devices = Device.objects.filter(is_active=True)
                        for d in devices:
                            if hardware_address.endswith(d.hardware_address) or d.hardware_address in hardware_address:
                                device = d
                                logger.info(f'Matched device {d.name} ({d.hardware_address}) to topic {topic} via partial match')
                                break
                    
                    # If still no match and only one active device, use it (fallback for testing)
                    if not device:
                        active_devices = list(Device.objects.filter(is_active=True))
                        if len(active_devices) == 1:
                            device = active_devices[0]
                            logger.warning(
                                f'No exact match for topic {topic}, but only one active device found. '
                                f'Using device {device.name} ({device.hardware_address}). '
                                f'Consider setting mqtt_topic_pattern="{topic}" for this device.'
                            )

                if not device:
                    available_devices = Device.objects.filter(is_active=True).values_list('id', 'name', 'hardware_address', 'mqtt_topic_pattern')
                    device_list = ', '.join([f'{d[1]} (HW: {d[2]}, Topic: {d[3] or "Not set"})' for d in available_devices])
                    logger.warning(
                        f'No active device found for topic: {topic}\n'
                        f'Available devices: {device_list}\n'
                        f'To fix: Set mqtt_topic_pattern="{topic}" for the correct device via device edit or API.'
                    )
                    return

                payload = msg.payload.decode('utf-8')
                logger.debug(f'Processing payload for device {device.name} ({device.hardware_address}): {payload[:200]}')
                
                data = json.loads(payload)
                if not isinstance(data, dict):
                    logger.warning('Ignoring non-dict payload on %s', topic)
                    return

                # Normalize to dict of numbers for storage
                parameters = {}
                for k, v in data.items():
                    if isinstance(v, (int, float)):
                        parameters[str(k)] = v
                    elif isinstance(v, str) and v.replace('.', '', 1).replace('-', '', 1).isdigit():
                        try:
                            parameters[str(k)] = float(v)
                        except ValueError:
                            pass

                if not parameters:
                    logger.warning('No numeric parameters in payload on %s', topic)
                    return

                device_data = DeviceData.objects.create(device=device, parameters=parameters)
                device.last_data_received = device_data.timestamp
                device.save(update_fields=['last_data_received'])
                check_thresholds_and_create_alarms(device, parameters)
                logger.info(f'Stored data for device {device.name} ({device.hardware_address}) from topic {topic}: {len(parameters)} parameters')
            except json.JSONDecodeError as e:
                logger.warning('Invalid JSON on %s: %s', msg.topic, e)
            except Exception as e:
                logger.exception('Error processing message on %s: %s', msg.topic, e)
        return on_message

    def _on_disconnect(self, client, userdata, flags, reason_code, properties=None):
        rc = getattr(reason_code, 'value', reason_code) if reason_code is not None else 0
        if rc != 0:
            self.stdout.write(self.style.WARNING(f'MQTT disconnected: {reason_code}'))
