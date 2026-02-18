# MQTT Data Capture Troubleshooting Guide

## Current Status Check

Your device is configured:
- **Device ID**: 12
- **Name**: Energy meter
- **MQTT Host**: localhost
- **MQTT Port**: 1883
- **MQTT Topic Pattern**: `topic/EM/12354`
- **Status**: Active

However, **no data is being stored** (0 DeviceData records). This guide will help you diagnose and fix the issue.

## Step 1: Verify MQTT Subscriber is Running

When you start Django with `python manage.py runserver`, check the console output for:

```
✓ Found 1 device(s) with per-device MQTT configuration. Starting MQTT subscribers automatically.
✓ Connected to MQTT broker localhost:1883
✓ Successfully subscribed to topic 'topic/EM/12354' for device 12 (Energy meter) - waiting for data...
✓ MQTT subscribers started automatically - data capture active
```

**If you don't see these messages:**
- The MQTT subscriber thread might not have started
- Check for errors in the console
- Restart the Django server

## Step 2: Verify MQTT Broker is Running

The device is configured to connect to `localhost:1883`. Make sure:
1. Your MQTT broker (e.g., Mosquitto) is running
2. It's listening on port 1883
3. It's accessible from the Django server

**Test connection:**
```bash
# If you have mosquitto installed
mosquitto_pub -h localhost -p 1883 -t "topic/EM/12354" -m '{"KWH": 100, "AV": 230, "KW": 5}'
```

## Step 3: Verify Topic Pattern Matches

Your device is subscribed to: `topic/EM/12354`

**Check what topic your device is actually publishing to:**
- Use MQTT Explorer or similar tool
- Look at the actual topic name in published messages
- It must **exactly match** `topic/EM/12354` (case-sensitive)

**Common issues:**
- Topic mismatch: Device publishes to `EM/12354` but subscribed to `topic/EM/12354`
- Case sensitivity: `Topic/EM/12354` ≠ `topic/EM/12354`
- Extra spaces: `topic/EM/12354 ` ≠ `topic/EM/12354`

## Step 4: Check Logs for Incoming Messages

When data is received, you should see:
```
📨 Received MQTT message on topic: topic/EM/12354 (payload length: XX bytes)
💾 Stored data for device Energy meter (12354) from topic topic/EM/12354: X parameters - 2026-02-16 XX:XX:XX
```

**If you see "No device found for topic":**
- The topic pattern doesn't match
- Update the device's MQTT Topic Pattern to match the actual topic

**If you don't see any messages:**
- Device isn't publishing data
- MQTT broker isn't forwarding messages
- Network connectivity issue

## Step 5: Verify Data Storage

Check if data is being stored:
```bash
python manage.py shell -c "from devices.models import DeviceData; print(f'Total records: {DeviceData.objects.count()}'); latest = DeviceData.objects.order_by('-timestamp').first(); print(f'Latest: {latest.timestamp if latest else None}')"
```

## Step 6: Real-time Data Display

The frontend automatically refreshes every 5 seconds. Check:
1. Device Detail page (`/devices/12`)
2. Dashboard page
3. Both should show real-time parameters if data is flowing

## Common Fixes

### Fix 1: Topic Pattern Mismatch
If your device publishes to `EM/12354` but you subscribed to `topic/EM/12354`:

1. Edit the device
2. Change MQTT Topic Pattern to: `EM/12354`
3. Save
4. The system will automatically re-subscribe

### Fix 2: MQTT Subscriber Not Running
If the subscriber didn't start automatically:

1. Restart Django server: `python manage.py runserver`
2. Check console for MQTT startup messages
3. If still not working, manually start: `python manage.py run_mqtt_subscriber`

### Fix 3: MQTT Broker Not Accessible
If connection fails:

1. Verify broker is running: `netstat -an | findstr 1883` (Windows)
2. Check firewall settings
3. Verify broker host/port in device configuration

## Automatic Features

✅ **Auto-start**: MQTT subscriber starts automatically with Django server
✅ **Auto-subscribe**: Devices are automatically subscribed when registered/updated
✅ **Auto-detect**: New devices are detected within 10 seconds
✅ **Auto-store**: Data is automatically stored in database when received
✅ **Auto-display**: Frontend refreshes every 5 seconds to show latest data

## Still Not Working?

1. **Check Django logs** for MQTT-related errors
2. **Verify MQTT broker** is running and accessible
3. **Test with MQTT Explorer** to see what topics are being published
4. **Update device topic pattern** to match actual published topic
5. **Restart Django server** to ensure subscriber starts

## Expected Behavior

Once everything is working:
1. Device registers via MQTT wizard ✅
2. MQTT subscriber automatically starts ✅
3. Device automatically subscribes to topic ✅
4. Device publishes data to MQTT broker ✅
5. Subscriber receives messages ✅
6. Data is stored in database ✅
7. Frontend displays real-time data ✅

All of this happens **automatically** - no manual steps required!
