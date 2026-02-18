import logging
import threading
import time
import sys
from django.apps import AppConfig
from django.conf import settings

# Ensure logger is configured
logger = logging.getLogger(__name__)
# Set level to INFO to ensure messages are visible
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


class DevicesConfig(AppConfig):
    name = 'devices'
    _mqtt_thread = None
    _mqtt_thread_lock = threading.Lock()

    def ready(self):
        """Start MQTT subscriber automatically when Django is ready."""
        # Import signals to register them
        import devices.signals  # noqa
        
        # Check if we're in the main process (not StatReloader child)
        # StatReloader runs ready() in both parent and child processes
        # We only want to start MQTT in the actual server process
        import os
        if os.environ.get('RUN_MAIN') != 'true':
            # This is the parent process (StatReloader), skip
            logger.debug('MQTT auto-start skipped: StatReloader parent process')
            return
        
        # Log that ready() was called for debugging
        logger.info(f'🔧 DevicesConfig.ready() called - sys.argv={sys.argv}')
        
        # Always try to start unless explicitly blocked
        # This ensures it works even if runserver detection fails
        if self._should_start_mqtt_subscriber():
            logger.info('🚀 MQTT auto-start check passed, scheduling subscriber startup in 2 seconds...')
            # Delay start slightly to ensure database is ready
            threading.Timer(2.0, self._start_mqtt_subscriber).start()
        else:
            # Log why it's not starting for debugging
            if 'migrate' in sys.argv or 'makemigrations' in sys.argv:
                logger.debug('MQTT auto-start skipped: migration command')
            elif 'test' in sys.argv:
                logger.debug('MQTT auto-start skipped: test command')
            elif not getattr(settings, 'MQTT_AUTO_START', True):
                logger.info('MQTT auto-start skipped: disabled in settings')
            else:
                logger.warning(f'⚠️ MQTT auto-start skipped: sys.argv={sys.argv} - check _should_start_mqtt_subscriber logic')

    def _should_start_mqtt_subscriber(self):
        """Check if MQTT subscriber should start automatically."""
        import os
        
        # Check if auto-start is enabled (default: True)
        auto_start = getattr(settings, 'MQTT_AUTO_START', True)
        if not auto_start:
            logger.info('MQTT auto-start is disabled in settings')
            return False
        
        # If we're in StatReloader child process (RUN_MAIN='true'), we're likely running the server
        # In this case, be permissive unless explicitly blocked
        is_reloader_child = os.environ.get('RUN_MAIN') == 'true'
        
        # Explicitly block certain commands that should never start MQTT
        blocking_commands = ['shell', 'shell_plus', 'migrate', 'makemigrations', 'test', 'collectstatic', 'createsuperuser', 'flush', 'dumpdata', 'loaddata', 'check', 'showmigrations', 'dbshell']
        if any(cmd in sys.argv for cmd in blocking_commands):
            logger.debug(f'MQTT auto-start blocked: blocking command detected in sys.argv={sys.argv}')
            return False
        
        # If runserver is in command line, definitely start
        cmd_line = ' '.join(sys.argv).lower()
        if 'runserver' in cmd_line:
            logger.debug(f'MQTT auto-start allowed: runserver detected in sys.argv={sys.argv}')
            return True
        
        # If we're in StatReloader child process and no blocking commands, start
        # This handles the case where StatReloader child doesn't have 'runserver' in sys.argv
        if is_reloader_child:
            logger.debug(f'MQTT auto-start allowed: StatReloader child process (RUN_MAIN=true), sys.argv={sys.argv}')
            return True
        
        # Otherwise, don't start
        logger.debug(f'MQTT auto-start blocked: not runserver and not StatReloader child, sys.argv={sys.argv}')
        return False

    def _start_mqtt_subscriber(self):
        """Start MQTT subscriber in a background thread."""
        with self._mqtt_thread_lock:
            if self._mqtt_thread is not None and self._mqtt_thread.is_alive():
                logger.info('MQTT subscriber thread already running')
                return
            
            logger.info('🚀 Starting MQTT subscriber automatically...')
            
            def run_subscriber():
                try:
                    import django
                    django.setup()  # Ensure Django is set up in this thread
                    
                    from devices.mqtt_service import get_mqtt_connection_manager
                    from devices.models import Device
                    
                    logger.info('🔧 MQTT subscriber thread started, waiting for database...')
                    # Wait a bit for database to be fully ready
                    time.sleep(2)
                    
                    # Check if any devices have MQTT configuration
                    devices_with_mqtt = Device.objects.filter(
                        is_active=True,
                        mqtt_broker_host__isnull=False
                    ).exclude(mqtt_broker_host='')
                    
                    device_count = devices_with_mqtt.count()
                    logger.info(f'🔍 Found {device_count} device(s) with MQTT configuration')
                    
                    if device_count > 0:
                        logger.info(
                            f'✅ Found {device_count} device(s) with per-device MQTT configuration. '
                            'Starting MQTT subscribers automatically...'
                        )
                        manager = get_mqtt_connection_manager()
                        logger.info('📡 Calling subscribe_all_devices()...')
                        manager.subscribe_all_devices()
                        logger.info('✅ MQTT subscribers started automatically - data capture ACTIVE!')
                        
                        # Keep thread alive and periodically check for new devices
                        # Use shorter interval to catch new devices faster
                        while True:
                            time.sleep(10)  # Check every 10 seconds for new devices
                            # Re-subscribe if needed (for new devices or configuration changes)
                            try:
                                # Check for new devices
                                current_devices = Device.objects.filter(
                                    is_active=True,
                                    mqtt_broker_host__isnull=False
                                ).exclude(mqtt_broker_host='')
                                
                                if current_devices.count() != device_count:
                                    logger.info(f'Device count changed ({device_count} -> {current_devices.count()}), re-subscribing all devices')
                                    device_count = current_devices.count()
                                
                                manager.subscribe_all_devices()
                            except Exception as e:
                                logger.error(f'Error re-subscribing devices: {e}', exc_info=True)
                    else:
                        # Fall back to global configuration
                        import os
                        from devices.management.commands.run_mqtt_subscriber import Command
                        from django.core.management import call_command
                        
                        host = os.environ.get('MQTT_BROKER_HOST', 'localhost')
                        port = int(os.environ.get('MQTT_BROKER_PORT', '1883'))
                        prefix = os.environ.get('MQTT_TOPIC_PREFIX', 'EM')
                        
                        logger.info(f'No devices with per-device MQTT config. Using global: {host}:{port}, prefix: {prefix}')
                        
                        # Use the command's logic but run in thread
                        call_command('run_mqtt_subscriber', host=host, port=port, prefix=prefix)
                        
                except Exception as e:
                    logger.error(f'❌ MQTT subscriber thread error: {e}', exc_info=True)
                    import traceback
                    logger.error(f'Full traceback: {traceback.format_exc()}')
            
            thread = threading.Thread(
                target=run_subscriber,
                name='mqtt-subscriber',
                daemon=True  # Dies when main process exits
            )
            thread.start()
            self._mqtt_thread = thread
            logger.info('✅ MQTT subscriber thread started automatically - monitoring for devices...')
