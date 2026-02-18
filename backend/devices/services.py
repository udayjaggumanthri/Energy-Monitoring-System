"""
Module 5: Threshold breach check and alarm creation.
Called after device data is stored (POST device-data or MQTT subscriber).
"""
import json
import logging
import threading
import time
from typing import Dict, List, Optional
from django.conf import settings
from django.utils import timezone

import paho.mqtt.client as mqtt

from .models import Device, Threshold, Alarm, ParameterMapping

logger = logging.getLogger(__name__)


def get_parameter_label(parameter_key: str) -> str:
    """Resolve hardware key to UI label from ParameterMapping."""
    mapping = ParameterMapping.objects.filter(hardware_key=parameter_key).first()
    return mapping.ui_label if mapping else parameter_key


def check_thresholds_and_create_alarms(device: Device, parameters: dict) -> list:
    """
    Load thresholds for device, compare parameters to min/max, create Alarm on breach.
    Skips creating duplicate unacknowledged alarm for same (device, parameter_key).
    Returns list of created Alarm instances.
    """
    if not parameters or not isinstance(parameters, dict):
        return []

    thresholds = Threshold.objects.filter(device=device)
    created = []

    for th in thresholds:
        value = parameters.get(th.parameter_key)
        if value is None:
            continue
        try:
            value = float(value)
        except (TypeError, ValueError):
            continue

        label = get_parameter_label(th.parameter_key)

        if th.min is not None and value < th.min:
            if not Alarm.objects.filter(
                device=device,
                parameter_key=th.parameter_key,
                acknowledged=False
            ).exists():
                alarm = Alarm.objects.create(
                    device=device,
                    parameter_key=th.parameter_key,
                    parameter_label=label,
                    value=value,
                    threshold=th.min,
                    type=Alarm.TYPE_MIN,
                )
                created.append(alarm)
                _send_alarm_email(alarm)

        if th.max is not None and value > th.max:
            if not Alarm.objects.filter(
                device=device,
                parameter_key=th.parameter_key,
                acknowledged=False
            ).exists():
                alarm = Alarm.objects.create(
                    device=device,
                    parameter_key=th.parameter_key,
                    parameter_label=label,
                    value=value,
                    threshold=th.max,
                    type=Alarm.TYPE_MAX,
                )
                created.append(alarm)
                _send_alarm_email(alarm)

    return created


def _send_alarm_email(alarm: Alarm) -> None:
    """Send email notification if ALARM_EMAIL_TO is configured."""
    recipients = getattr(settings, 'ALARM_EMAIL_TO', None)
    if not recipients:
        return
    if isinstance(recipients, str):
        recipients = [r.strip() for r in recipients.split(',') if r.strip()]
    if not recipients:
        return

    try:
        from django.core.mail import send_mail
        subject = f"Threshold breach: {alarm.device.name} - {alarm.parameter_label}"
        message = (
            f"Device: {alarm.device.name}\n"
            f"Parameter: {alarm.parameter_label} ({alarm.parameter_key})\n"
            f"Value: {alarm.value}\n"
            f"Limit ({alarm.type}): {alarm.threshold}\n"
        )
        send_mail(
            subject,
            message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'noreply@localhost',
            recipient_list=recipients,
            fail_silently=True,
        )
    except Exception as e:
        logger.warning('Failed to send alarm email: %s', e)


def test_mqtt_connection(
    broker_host: str,
    broker_port: int,
    topic_prefix: str,
    username: Optional[str] = None,
    password: Optional[str] = None,
    use_tls: bool = False,
    tls_ca_certs: Optional[str] = None,
    timeout_seconds: int = 15
) -> Dict:
    """
    Test MQTT connection and capture sample messages.
    
    Args:
        broker_host: MQTT broker hostname or IP
        broker_port: MQTT broker port
        topic_prefix: Topic prefix to subscribe to (e.g., "EM")
        username: Optional MQTT username
        password: Optional MQTT password
        use_tls: Whether to use TLS/SSL
        tls_ca_certs: Optional CA certificate path or content
        timeout_seconds: How long to listen for messages (default: 15)
    
    Returns:
        Dict with:
            - success: bool
            - connection_status: str
            - messages: List of captured messages
            - detected_hardware_addresses: List of unique hardware addresses
            - all_parameter_keys: List of all parameter keys found
            - error: Optional error message
    """
    messages = []
    connection_status = "disconnected"
    error_message = None
    connection_event = threading.Event()
    messages_lock = threading.Lock()
    
    def on_connect(client, userdata, flags, reason_code, properties=None):
        nonlocal connection_status
        rc = getattr(reason_code, 'value', reason_code) if reason_code is not None else 0
        if rc == 0:
            connection_status = "connected"
            # Subscribe to topic pattern: {prefix}/* or {prefix}/+
            topic_pattern = f"{topic_prefix}/+" if topic_prefix else "+"
            client.subscribe(topic_pattern)
            logger.info(f"Connected to MQTT broker and subscribed to {topic_pattern}")
        else:
            connection_status = f"failed (code: {rc})"
            error_message = f"MQTT connection failed with code: {rc}"
        connection_event.set()
    
    def on_message(client, userdata, msg):
        try:
            topic = msg.topic
            raw_payload = msg.payload.decode('utf-8')
            
            # Parse JSON payload
            try:
                parsed_payload = json.loads(raw_payload)
                if not isinstance(parsed_payload, dict):
                    logger.warning(f"Non-dict payload on {topic}: {parsed_payload}")
                    return
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON on {topic}: {e}")
                parsed_payload = {}
            
            # Extract hardware address from topic (e.g., EM/46521 -> 46521)
            hardware_address = None
            if topic_prefix:
                parts = topic.split('/', 1)
                if len(parts) > 1:
                    potential_hw = parts[-1]
                    if potential_hw.isdigit() and len(potential_hw) == 5:
                        hardware_address = potential_hw
            else:
                # Try to extract from topic directly
                if topic.isdigit() and len(topic) == 5:
                    hardware_address = topic
            
            # Also check payload for hardware_address field
            if not hardware_address and isinstance(parsed_payload, dict):
                hw_from_payload = parsed_payload.get('hardware_address') or parsed_payload.get('hw_addr')
                if hw_from_payload and str(hw_from_payload).isdigit() and len(str(hw_from_payload)) == 5:
                    hardware_address = str(hw_from_payload)
            
            # Extract parameter keys (numeric values only)
            parameter_keys = []
            if isinstance(parsed_payload, dict):
                for k, v in parsed_payload.items():
                    if isinstance(v, (int, float)) or (isinstance(v, str) and v.replace('.', '', 1).replace('-', '', 1).isdigit()):
                        parameter_keys.append(str(k))
            
            message_data = {
                "topic": topic,
                "raw_payload": raw_payload,
                "parsed_payload": parsed_payload,
                "hardware_address": hardware_address,
                "parameter_keys": parameter_keys,
                "timestamp": timezone.now().isoformat()
            }
            
            with messages_lock:
                messages.append(message_data)
                
        except Exception as e:
            logger.warning(f"Error processing message on {msg.topic}: {e}")
    
    def on_disconnect(client, userdata, flags, reason_code, properties=None):
        logger.info(f"MQTT client disconnected: {reason_code}")
    
    try:
        # Create MQTT client
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        except AttributeError:
            client = mqtt.Client()
        
        client.on_connect = on_connect
        client.on_message = on_message
        client.on_disconnect = on_disconnect
        
        # Set credentials if provided
        if username and password:
            client.username_pw_set(username, password)
        
        # Configure TLS if needed
        if use_tls:
            if tls_ca_certs:
                # If tls_ca_certs is a file path, use it; otherwise treat as certificate content
                import os
                if os.path.exists(tls_ca_certs):
                    client.tls_set(ca_certs=tls_ca_certs)
                else:
                    # Treat as certificate content, write to temp file
                    import tempfile
                    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.pem') as f:
                        f.write(tls_ca_certs)
                        temp_cert_path = f.name
                    client.tls_set(ca_certs=temp_cert_path)
                    # Clean up temp file after connection
                    try:
                        os.unlink(temp_cert_path)
                    except:
                        pass
            else:
                client.tls_set()
        
        # Connect to broker
        client.connect(broker_host, broker_port, 60)
        
        # Start network loop in background thread
        client.loop_start()
        
        # Wait for connection (with timeout)
        if not connection_event.wait(timeout=10):
            client.loop_stop()
            client.disconnect()
            return {
                "success": False,
                "connection_status": "timeout",
                "messages": [],
                "detected_hardware_addresses": [],
                "all_parameter_keys": [],
                "error": "Connection timeout - broker did not respond within 10 seconds"
            }
        
        if connection_status != "connected":
            client.loop_stop()
            client.disconnect()
            return {
                "success": False,
                "connection_status": connection_status,
                "messages": [],
                "detected_hardware_addresses": [],
                "all_parameter_keys": [],
                "error": error_message or f"Failed to connect: {connection_status}"
            }
        
        # Listen for messages for the specified timeout
        time.sleep(timeout_seconds)
        
        # Stop and disconnect
        client.loop_stop()
        client.disconnect()
        
        # Extract unique hardware addresses and parameter keys
        detected_hardware_addresses = list(set([
            msg["hardware_address"] for msg in messages
            if msg["hardware_address"]
        ]))
        
        all_parameter_keys = list(set([
            key for msg in messages
            for key in msg["parameter_keys"]
        ]))
        
        return {
            "success": True,
            "connection_status": connection_status,
            "messages": messages,
            "detected_hardware_addresses": detected_hardware_addresses,
            "all_parameter_keys": all_parameter_keys,
            "error": None
        }
        
    except Exception as e:
        logger.exception(f"MQTT test connection error: {e}")
        return {
            "success": False,
            "connection_status": "error",
            "messages": [],
            "detected_hardware_addresses": [],
            "all_parameter_keys": [],
            "error": str(e)
        }
