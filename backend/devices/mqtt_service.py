"""
MQTT Service - Centralized MQTT connection management with per-device broker support.
Supports dynamic subscription/unsubscription and handles per-device broker configurations.
"""
import json
import logging
from collections import defaultdict
from typing import Dict, List, Optional, Set
from django.utils import timezone

import paho.mqtt.client as mqtt

from .models import Device, DeviceData
from .services import check_thresholds_and_create_alarms

logger = logging.getLogger(__name__)
# Ensure logger level is set to INFO for visibility
logger.setLevel(logging.INFO)


class MQTTConnectionManager:
    """Manages MQTT connections for multiple brokers with per-device configurations."""
    
    def __init__(self):
        self.clients: Dict[str, mqtt.Client] = {}  # Key: "{host}:{port}"
        self.subscribed_topics: Dict[str, Set[str]] = defaultdict(set)  # Key: "{host}:{port}", Value: set of topics
        self.device_topic_map: Dict[str, int] = {}  # Key: topic, Value: device_id
    
    def _get_broker_key(self, host: str, port: int) -> str:
        """Generate unique key for broker."""
        return f"{host}:{port}"
    
    def _get_client(self, host: str, port: int, username: Optional[str] = None,
                   password: Optional[str] = None, use_tls: bool = False,
                   tls_ca_certs: Optional[str] = None) -> mqtt.Client:
        """Get or create MQTT client for a broker."""
        broker_key = self._get_broker_key(host, port)
        
        if broker_key in self.clients:
            return self.clients[broker_key]
        
        # Create new client
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        except AttributeError:
            client = mqtt.Client()
        
        # Set credentials
        if username and password:
            client.username_pw_set(username, password)
        
        # Configure TLS
        if use_tls:
            if tls_ca_certs:
                import os
                if os.path.exists(tls_ca_certs):
                    client.tls_set(ca_certs=tls_ca_certs)
                else:
                    # Treat as certificate content
                    import tempfile
                    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.pem') as f:
                        f.write(tls_ca_certs)
                        temp_cert_path = f.name
                    client.tls_set(ca_certs=temp_cert_path)
            else:
                client.tls_set()
        
        # Set up callbacks
        def on_connect(client, userdata, flags, reason_code, properties=None):
            rc = getattr(reason_code, 'value', reason_code) if reason_code is not None else 0
            if rc == 0:
                logger.info(f"✓ Connected to MQTT broker {broker_key}")
                # Resubscribe to all topics for this broker.
                # Copy to list to avoid 'Set changed size during iteration' errors
                topics = list(self.subscribed_topics[broker_key])
                if topics:
                    logger.info(f"Resubscribing to {len(topics)} topic(s) on {broker_key}")
                    for topic in topics:
                        result = client.subscribe(topic)
                        if result and result[0] == mqtt.MQTT_ERR_SUCCESS:
                            logger.debug(f"✓ Resubscribed to {topic}")
                        else:
                            logger.warning(f"Failed to resubscribe to {topic}: {result}")
                else:
                    logger.info(f"No topics to resubscribe on {broker_key}")
            else:
                logger.error(f"✗ Failed to connect to MQTT broker {broker_key}: {reason_code}")
        
        def on_message(client, userdata, msg):
            self._handle_message(msg)
        
        def on_disconnect(client, userdata, flags, reason_code, properties=None):
            logger.warning(f"Disconnected from MQTT broker {broker_key}: {reason_code}")
        
        client.on_connect = on_connect
        client.on_message = on_message
        client.on_disconnect = on_disconnect
        
        # Connect
        try:
            logger.info(f"Connecting to MQTT broker {broker_key}...")
            client.connect(host, port, 60)
            client.loop_start()
            self.clients[broker_key] = client
            logger.info(f"✓ Created MQTT client for {broker_key}, connection in progress...")
            # Give connection a moment to establish
            import time
            time.sleep(0.5)
        except Exception as e:
            logger.error(f"✗ Failed to connect to MQTT broker {broker_key}: {e}", exc_info=True)
            raise
        
        return client
    
    def _handle_message(self, msg):
        """Handle incoming MQTT message."""
        try:
            topic = msg.topic
            logger.info(f'📨 Received MQTT message on topic: {topic} (payload length: {len(msg.payload)} bytes)')
            
            # Find device by topic mapping (exact match)
            device_id = self.device_topic_map.get(topic)
            device = None
            
            if device_id:
                device = Device.objects.filter(id=device_id, is_active=True).first()
            
            # If not found by exact topic match, try pattern matching
            if not device:
                # Try to find device by topic pattern (supports wildcards)
                devices_with_mqtt = Device.objects.filter(
                    is_active=True,
                    mqtt_topic_pattern__isnull=False
                ).exclude(mqtt_topic_pattern='')
                
                for d in devices_with_mqtt:
                    pattern = d.mqtt_topic_pattern
                    # Exact match
                    if pattern == topic:
                        device = d
                        logger.info(f'Matched device {d.name} by exact topic pattern: {pattern}')
                        break
                    # Wildcard match: if pattern ends with +, match prefix
                    elif pattern.endswith('+') and topic.startswith(pattern[:-1]):
                        device = d
                        logger.info(f'Matched device {d.name} by wildcard pattern: {pattern}')
                        break
                    # Suffix match: if topic ends with hardware_address
                    elif topic.endswith(d.hardware_address):
                        device = d
                        logger.info(f'Matched device {d.name} by hardware address suffix: {d.hardware_address}')
                        break
            
            # Last resort: if only one active device and no topic pattern match, use it
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
                    f'No device found for topic: {topic}\n'
                    f'Mapped topics: {list(self.device_topic_map.keys())}\n'
                    f'Available devices: {device_list}\n'
                    f'To fix: Set mqtt_topic_pattern="{topic}" for the correct device.'
                )
                return
            
            # Parse payload
            payload = msg.payload.decode('utf-8')
            try:
                data = json.loads(payload)
                if not isinstance(data, dict):
                    logger.warning(f'Ignoring non-dict payload on {topic}')
                    return
            except json.JSONDecodeError as e:
                logger.warning(f'Invalid JSON on {topic}: {e}')
                return
            
            # Normalize to dict of numbers
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
                logger.warning(f'No numeric parameters in payload on {topic}')
                return
            
            # Store device data
            device_data = DeviceData.objects.create(device=device, parameters=parameters)
            device.last_data_received = device_data.timestamp
            device.save(update_fields=['last_data_received'])
            
            # Check thresholds and create alarms
            check_thresholds_and_create_alarms(device, parameters)
            
            logger.info(f'💾 Stored data for device {device.name} ({device.hardware_address}) from topic {topic}: {len(parameters)} parameters - {device_data.timestamp}')
            
        except Exception as e:
            logger.exception(f'Error processing message on {msg.topic}: {e}')
    
    def subscribe_device(self, device: Device):
        """Subscribe to MQTT topic for a device. Creates client and connection if needed."""
        if not device.is_active:
            logger.debug(f"Skipping inactive device {device.id}")
            return
        
        # Check if device has MQTT configuration
        if not device.mqtt_broker_host or not device.mqtt_topic_pattern:
            logger.warning(f"Device {device.id} ({device.name}) has incomplete MQTT configuration: host={device.mqtt_broker_host}, pattern={device.mqtt_topic_pattern}")
            return
        
        try:
            # Get or create client for this broker (will create and connect if needed)
            client = self._get_client(
                host=device.mqtt_broker_host,
                port=device.mqtt_broker_port or 1883,
                username=device.mqtt_username if device.mqtt_username else None,
                password=device.mqtt_password if device.mqtt_password else None,
                use_tls=device.mqtt_use_tls,
                tls_ca_certs=device.mqtt_tls_ca_certs if device.mqtt_tls_ca_certs else None
            )
            
            topic = device.mqtt_topic_pattern
            broker_key = self._get_broker_key(device.mqtt_broker_host, device.mqtt_broker_port or 1883)
            
            # Check if already subscribed to avoid duplicate subscriptions
            if topic in self.subscribed_topics[broker_key]:
                logger.debug(f"Device {device.id} already subscribed to topic {topic}, updating mapping")
                # Update device mapping in case device ID changed
                self.device_topic_map[topic] = device.id
                return
            
            # Subscribe to topic (support wildcards)
            result = None
            if topic.endswith('+'):
                # Wildcard subscription
                result = client.subscribe(topic)
            else:
                # Exact topic subscription
                result = client.subscribe(topic)
            
            # Check subscription result
            if result and result[0] == mqtt.MQTT_ERR_SUCCESS:
                self.subscribed_topics[broker_key].add(topic)
                self.device_topic_map[topic] = device.id
                logger.info(f"✓ Successfully subscribed to topic '{topic}' for device {device.id} ({device.name}) - waiting for data...")
            else:
                logger.error(f"Failed to subscribe to topic '{topic}' for device {device.id}: MQTT error {result}")
            
        except Exception as e:
            logger.error(f"Failed to subscribe device {device.id} ({device.name}) to MQTT: {e}", exc_info=True)
    
    def unsubscribe_device(self, device: Device):
        """Unsubscribe from MQTT topic for a device."""
        if not device.mqtt_topic_pattern:
            return
        
        topic = device.mqtt_topic_pattern
        broker_key = self._get_broker_key(device.mqtt_broker_host or '', device.mqtt_broker_port or 1883)
        
        if broker_key in self.clients:
            client = self.clients[broker_key]
            client.unsubscribe(topic)
            self.subscribed_topics[broker_key].discard(topic)
            self.device_topic_map.pop(topic, None)
            logger.info(f"Unsubscribed from topic {topic} for device {device.id}")
    
    def subscribe_all_devices(self):
        """Subscribe to all active devices with MQTT configuration."""
        devices = Device.objects.filter(
            is_active=True,
            mqtt_broker_host__isnull=False
        ).exclude(mqtt_broker_host='')
        
        device_list = list(devices)
        count = len(device_list)
        
        if count == 0:
            logger.debug("No devices with MQTT configuration found to subscribe")
            return
        
        logger.info(f"Subscribing to {count} device(s) with MQTT configuration")
        
        for device in device_list:
            self.subscribe_device(device)
        
        logger.info(f"✓ Completed subscription check for {count} device(s)")
    
    def disconnect_all(self):
        """Disconnect all MQTT clients."""
        for broker_key, client in self.clients.items():
            try:
                client.loop_stop()
                client.disconnect()
                logger.info(f"Disconnected from broker {broker_key}")
            except Exception as e:
                logger.error(f"Error disconnecting from broker {broker_key}: {e}")
        
        self.clients.clear()
        self.subscribed_topics.clear()
        self.device_topic_map.clear()


# Global instance
_connection_manager: Optional[MQTTConnectionManager] = None


def get_mqtt_connection_manager() -> MQTTConnectionManager:
    """Get or create global MQTT connection manager."""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = MQTTConnectionManager()
    return _connection_manager
