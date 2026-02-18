# Quick Start Guide

## Installation & Running

1. **Navigate to project directory:**
   ```bash
   cd iot-energy-monitor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Open browser:**
   The app will automatically open at `http://localhost:3000`

## Login Credentials

Use any of these test accounts (password is `password` for all):

- **Super Admin**: `superadmin@example.com`
- **Admin**: `admin@example.com`  
- **User**: `user@example.com`

## Initial Setup

1. **Login as Super Admin** to configure:
   - Parameter Mapping (map hardware JSON keys to UI labels)
   - White-Labeling (upload logo, set system title)

2. **Login as Admin** to:
   - Register devices (5-digit hardware addresses)
   - Set thresholds for alarms
   - Manage users and assign devices
   - View grouped dashboards

3. **Login as User** to:
   - View assigned device dashboards
   - Download reports

## Sample Data

The system automatically creates 5 sample devices on first load:
- Main Meter - Building A (12345)
- Sub Meter 1 - Building A (23456)
- Main Meter - Building B (34567)
- Sub Meter 2 - Building B (45678)
- Main Meter - Building C (56789)

Device data is loaded from the backend; send data via POST /api/device-data/ for real-time updates.

## Features to Test

1. **Dashboard**: View real-time device data in grid layout
2. **Device Registration**: Add new devices with 5-digit addresses
3. **Parameter Mapping**: Map hardware keys (v, a, pf, hz, tkW) to labels
4. **Thresholds**: Set min/max limits and see alarms trigger
5. **Grouped Dashboards**: View hierarchical Area → Building → Floor structure
6. **Reports**: Export CSV with historical data
7. **White-Labeling**: Customize logo and title

## Data Storage

All data is stored in browser localStorage. To reset:
- Open browser DevTools
- Application → Local Storage
- Clear all entries
- Refresh the page

## Next Steps

- Use Django DRF backend for all modules (Module 1 & 2 already integrated)
- Integrate real MQTT/WebSocket for live data
- Add real email service for alarm notifications
- Scale to 200+ devices (already optimized for this)
