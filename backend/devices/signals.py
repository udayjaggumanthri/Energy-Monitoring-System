"""
Django signals for device-related events.
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Device

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Device)
def device_saved(sender, instance, created, **kwargs):
    """Automatically subscribe to MQTT when a device is created or updated with MQTT configuration."""
    # Only subscribe if device has complete MQTT configuration
    if not instance.mqtt_broker_host or not instance.mqtt_topic_pattern:
        logger.debug(f'Device {instance.id} missing MQTT config (host: {instance.mqtt_broker_host}, pattern: {instance.mqtt_topic_pattern})')
        return
    
    # Only subscribe if device is active
    if not instance.is_active:
        logger.debug(f'Device {instance.id} is inactive, skipping MQTT subscription')
        return
    
    try:
        from .mqtt_service import get_mqtt_connection_manager
        manager = get_mqtt_connection_manager()
        
        # Always try to subscribe - subscribe_device will create clients if needed
        # This ensures immediate subscription even if manager wasn't initialized yet
        manager.subscribe_device(instance)
        logger.info(f'✓ Automatically subscribed device {instance.id} ({instance.name}) to MQTT topic {instance.mqtt_topic_pattern} after {"creation" if created else "update"}')
    except Exception as e:
        # Don't fail device save if MQTT subscription fails, but log it
        logger.warning(f'Failed to auto-subscribe device {instance.id} to MQTT (will retry on next check): {e}', exc_info=True)


@receiver(post_delete, sender=Device)
def device_deleted(sender, instance, **kwargs):
    """Unsubscribe from MQTT when a device is deleted."""
    if not instance.mqtt_broker_host or not instance.mqtt_topic_pattern:
        return
    
    try:
        from .mqtt_service import get_mqtt_connection_manager
        manager = get_mqtt_connection_manager()
        manager.unsubscribe_device(instance)
        logger.info(f'Unsubscribed device {instance.id} ({instance.name}) from MQTT after deletion')
    except Exception as e:
        logger.error(f'Failed to unsubscribe device {instance.id} from MQTT: {e}', exc_info=True)
