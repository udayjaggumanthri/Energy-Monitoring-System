# MQTT Data Ingestion Setup

## Overview

The system continuously captures and stores device data from MQTT brokers. Data is stored in the `DeviceData` model and displayed in real-time on the Dashboard and Device Detail pages.

## Automatic Startup (Recommended)

**The MQTT subscriber now starts automatically when you run the Django server!** 

When you run `python manage.py runserver`, the MQTT subscriber will automatically start in the background after a 2-second delay. You no longer need to run `python manage.py run_mqtt_subscriber` separately.

### Configuration

To disable automatic startup, add this to your `settings.py` or `.env` file:
```python
MQTT_AUTO_START = False  # Set to False to disable auto-start
```

Or in your `.env` file:
```
MQTT_AUTO_START=False
```

### Manual Control

If you prefer to run the MQTT subscriber manually (or if auto-start is disabled), you can still use:
```bash
cd backend
python manage.py run_mqtt_subscriber
```

## Starting the MQTT Subscriber (Manual)

### For Devices with Per-Device MQTT Configuration

If devices are registered via the MQTT registration flow (with per-device broker settings), the subscriber will automatically:
- Detect devices with MQTT configuration
- Connect to each unique broker (host:port combination)
- Subscribe to device-specific topics
- Store incoming data in the database

### For Devices with Global Configuration (Legacy)

If no devices have per-device MQTT configuration, the subscriber falls back to global configuration:
- Uses environment variables: `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`, `MQTT_TOPIC_PREFIX`
- Or command-line arguments: `--host`, `--port`, `--prefix`

Example:
```bash
python manage.py run_mqtt_subscriber --host localhost --port 1883 --prefix EM
```

## Data Flow

1. **MQTT Message Received**: Device publishes data to MQTT topic (e.g., `EM/12354`)
2. **Data Parsed**: JSON payload is parsed and numeric parameters extracted
3. **Device Lookup**: System finds device by hardware address from topic
4. **Data Stored**: `DeviceData` record created with parameters and timestamp
5. **Device Updated**: Device's `last_data_received` timestamp updated
6. **Thresholds Checked**: System checks if any thresholds are breached
7. **Alarms Created**: If threshold breached, alarm is created
8. **Frontend Updated**: Dashboard and Device Detail pages refresh every 5 seconds

## Viewing Real-Time Data

### Dashboard
- Shows all devices with latest parameters
- Displays online/offline status
- Shows active alarms

### Device Detail Page
- Click on any device card to view details
- Shows real-time parameters with labels
- Displays historical data summary
- Auto-refreshes every 5 seconds

### Reports
- Download CSV reports with historical data
- Select device and date range
- Data pulled from `DeviceData` table

## Troubleshooting

### Device Shows "Offline" or "Never" Updated

1. **Check MQTT Subscriber is Running**
   ```bash
   # Should see: "MQTT subscribers started. Press Ctrl+C to stop."
   ```

2. **Verify Device MQTT Configuration**
   - Device must have `mqtt_broker_host` and `mqtt_topic_pattern` set
   - Check device configuration in admin or via API

3. **Check MQTT Broker Connection**
   - Verify broker is accessible from Django server
   - Check broker host, port, and credentials
   - Test connection using MQTT registration flow

4. **Verify Topic Pattern**
   - Device topic pattern should match what device publishes to
   - Example: If device publishes to `EM/12354`, topic pattern should be `EM/12354`

5. **Check Device is Active**
   - Device must have `is_active=True`
   - Inactive devices are skipped by subscriber

### No Data in Reports

1. **Verify Data is Being Stored**
   ```python
   # In Django shell
   from devices.models import DeviceData
   DeviceData.objects.count()  # Should be > 0
   ```

2. **Check Date Range**
   - Ensure selected date range includes times when data was received
   - Reports only show data within selected range

3. **Verify Device Selection**
   - Ensure correct device is selected
   - Check device has data in selected time range

## Running in Production

For production, run the MQTT subscriber as a background service:

### Using systemd (Linux)
Create `/etc/systemd/system/mqtt-subscriber.service`:
```ini
[Unit]
Description=MQTT Subscriber Service
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/backend
ExecStart=/path/to/venv/bin/python manage.py run_mqtt_subscriber
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable mqtt-subscriber
sudo systemctl start mqtt-subscriber
```

### Using Supervisor
Create `/etc/supervisor/conf.d/mqtt-subscriber.conf`:
```ini
[program:mqtt-subscriber]
command=/path/to/venv/bin/python manage.py run_mqtt_subscriber
directory=/path/to/backend
autostart=true
autorestart=true
user=your-user
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start mqtt-subscriber
```
