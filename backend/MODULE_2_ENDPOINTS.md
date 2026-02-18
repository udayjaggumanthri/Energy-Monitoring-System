# Module 2: Device Registration & Parameter Mapping API

**Base URL:** `http://127.0.0.1:8000/api`

## Overview

Module 2 provides APIs for:
1. **Device Registration** - Register and manage IoT energy monitoring devices
2. **Parameter Mapping** - Map hardware JSON keys to UI labels (Super Admin only)
3. **Device Data** - Store and retrieve real-time device data

---

## 🔹 Device Endpoints

### 1. List Devices
**GET** `/api/devices/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `area` (optional) - Filter by area
- `building` (optional) - Filter by building
- `floor` (optional) - Filter by floor
- `is_active` (optional) - Filter by active status (true/false)

**Permissions:**
- Super Admin & Admin: See all devices
- User: See only assigned devices

**Response:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "hardware_address": "46542",
      "name": "Main Building - Floor 1",
      "area": "Area A",
      "building": "Building 1",
      "floor": "Floor 1",
      "is_active": true,
      "assigned_users_count": 2,
      "created_at": "2026-01-27T10:00:00Z",
      "last_data_received": "2026-01-27T12:30:00Z"
    }
  ]
}
```

---

### 2. Create Device
**POST** `/api/devices/`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Permissions:** Admin and Super Admin only

**Body (JSON):**
```json
{
  "hardware_address": "46542",
  "name": "Main Building - Floor 1",
  "description": "Energy monitoring device for main building",
  "area": "Area A",
  "building": "Building 1",
  "floor": "Floor 1",
  "is_active": true,
  "assigned_user_ids": [2, 3]
}
```

**Required Fields:**
- `hardware_address` - Exactly 5 digits (e.g., "46542")
- `name` - User-friendly name

**Response:**
```json
{
  "message": "Device registered successfully",
  "device": {
    "id": 1,
    "hardware_address": "46542",
    "name": "Main Building - Floor 1",
    "description": "Energy monitoring device for main building",
    "area": "Area A",
    "building": "Building 1",
    "floor": "Floor 1",
    "is_active": true,
    "assigned_users": [
      {
        "id": 2,
        "username": "user1",
        "email": "user1@example.com",
        "role": "user"
      }
    ],
    "assigned_user_ids": [2, 3],
    "created_at": "2026-01-27T10:00:00Z",
    "updated_at": "2026-01-27T10:00:00Z",
    "last_data_received": null
  }
}
```

**Error Responses:**
- **403 Forbidden** (if not Admin/Super Admin):
```json
{
  "error": "Permission denied",
  "message": "Only Admin and Super Admin can register devices"
}
```

- **400 Bad Request** (if hardware address already exists):
```json
{
  "error": "Device already exists",
  "message": "Device with hardware address 46542 is already registered"
}
```

---

### 3. Get Device Details
**GET** `/api/devices/{id}/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Permissions:**
- Super Admin: Full access
- Admin: Full access
- User: Only assigned devices

**Response:**
```json
{
  "id": 1,
  "hardware_address": "46542",
  "name": "Main Building - Floor 1",
  "description": "Energy monitoring device",
  "area": "Area A",
  "building": "Building 1",
  "floor": "Floor 1",
  "is_active": true,
  "assigned_users": [
    {
      "id": 2,
      "username": "user1",
      "email": "user1@example.com",
      "role": "user"
    }
  ],
  "assigned_user_ids": [2, 3],
  "created_at": "2026-01-27T10:00:00Z",
  "updated_at": "2026-01-27T10:00:00Z",
  "last_data_received": "2026-01-27T12:30:00Z"
}
```

---

### 4. Update Device
**PUT** `/api/devices/{id}/` or **PATCH** `/api/devices/{id}/`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Permissions:** Admin and Super Admin only

**Body (JSON):**
```json
{
  "name": "Updated Device Name",
  "area": "Area B",
  "is_active": false,
  "assigned_user_ids": [2, 3, 4]
}
```

**Response:** Same as Get Device Details

---

### 5. Delete Device
**DELETE** `/api/devices/{id}/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Permissions:** Super Admin only

**Response:**
```
204 No Content
```

---

## 🔹 Parameter Mapping Endpoints

### 1. List Parameter Mappings
**GET** `/api/parameter-mappings/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Permissions:** All authenticated users (read-only)

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "hardware_key": "v",
      "ui_label": "Voltage",
      "unit": "V",
      "description": "Voltage measurement",
      "created_at": "2026-01-27T10:00:00Z",
      "updated_at": "2026-01-27T10:00:00Z"
    },
    {
      "id": 2,
      "hardware_key": "a",
      "ui_label": "Current",
      "unit": "A",
      "description": "Current measurement",
      "created_at": "2026-01-27T10:00:00Z",
      "updated_at": "2026-01-27T10:00:00Z"
    }
  ]
}
```

---

### 2. Create Parameter Mapping
**POST** `/api/parameter-mappings/`

**Headers:**
```
Authorization: Bearer {super_admin_token}
Content-Type: application/json
```

**Permissions:** Super Admin only

**Body (JSON):**
```json
{
  "hardware_key": "pf",
  "ui_label": "Power Factor",
  "unit": "",
  "description": "Power factor measurement"
}
```

**Required Fields:**
- `hardware_key` - Key sent by hardware (e.g., "v", "a", "pf")
- `ui_label` - Display label in UI

**Response:**
```json
{
  "message": "Parameter mapping created successfully",
  "mapping": {
    "id": 3,
    "hardware_key": "pf",
    "ui_label": "Power Factor",
    "unit": "",
    "description": "Power factor measurement",
    "created_at": "2026-01-27T10:00:00Z",
    "updated_at": "2026-01-27T10:00:00Z"
  }
}
```

**Error Responses:**
- **403 Forbidden** (if not Super Admin):
```json
{
  "error": "Permission denied",
  "message": "Only Super Admin can configure parameter mappings"
}
```

- **400 Bad Request** (if mapping already exists):
```json
{
  "error": "Mapping already exists",
  "message": "Parameter mapping for \"pf\" already exists"
}
```

---

### 3. Get Parameter Mapping Details
**GET** `/api/parameter-mappings/{id}/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Permissions:** All authenticated users

**Response:** Same format as list item

---

### 4. Update Parameter Mapping
**PUT** `/api/parameter-mappings/{id}/` or **PATCH** `/api/parameter-mappings/{id}/`

**Headers:**
```
Authorization: Bearer {super_admin_token}
Content-Type: application/json
```

**Permissions:** Super Admin only

**Body (JSON):**
```json
{
  "ui_label": "Updated Power Factor",
  "unit": "PF"
}
```

---

### 5. Delete Parameter Mapping
**DELETE** `/api/parameter-mappings/{id}/`

**Headers:**
```
Authorization: Bearer {super_admin_token}
```

**Permissions:** Super Admin only

**Response:**
```
204 No Content
```

---

## 🔹 Device Data Endpoints

### 1. Create Device Data (Hardware → Backend)
**POST** `/api/device-data/`

**Headers:**
```
Content-Type: application/json
```

**Note:** This endpoint can be public (no authentication) for hardware devices

**Body (JSON):**
```json
{
  "device": 1,
  "parameters": {
    "v": 230.5,
    "a": 5.2,
    "pf": 0.95,
    "hz": 50.1,
    "tkW": 1.2
  }
}
```

**Response:**
```json
{
  "message": "Device data recorded successfully",
  "data": {
    "id": 1,
    "device": 1,
    "device_name": "Main Building - Floor 1",
    "device_hardware_address": "46542",
    "parameters": {
      "v": 230.5,
      "a": 5.2,
      "pf": 0.95,
      "hz": 50.1,
      "tkW": 1.2
    },
    "timestamp": "2026-01-27T12:30:00Z"
  }
}
```

---

### 2. List Device Data (Historical)
**GET** `/api/device-data/list/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `device_id` (optional) - Filter by device ID

**Permissions:**
- Super Admin & Admin: See all device data
- User: See only data from assigned devices

**Response:**
```json
{
  "count": 100,
  "results": [
    {
      "id": 1,
      "device": 1,
      "device_name": "Main Building - Floor 1",
      "device_hardware_address": "46542",
      "parameters": {
        "v": 230.5,
        "a": 5.2,
        "pf": 0.95,
        "hz": 50.1,
        "tkW": 1.2
      },
      "timestamp": "2026-01-27T12:30:00Z"
    }
  ]
}
```

---

## 🚀 Complete Test Sequence

### 1. Login as Super Admin
```json
POST http://127.0.0.1:8000/api/auth/login/
{
  "email_or_mobile": "superadmin@example.com",
  "password": "password"
}
```

### 2. Create Parameter Mappings (Super Admin)
```json
POST http://127.0.0.1:8000/api/parameter-mappings/
Headers: Authorization: Bearer {super_admin_token}
{
  "hardware_key": "v",
  "ui_label": "Voltage",
  "unit": "V"
}
```

Repeat for: `a` → "Current", `pf` → "Power Factor", `hz` → "Frequency", `tkW` → "Total kW"

### 3. Register Device (Admin/Super Admin)
```json
POST http://127.0.0.1:8000/api/devices/
Headers: Authorization: Bearer {admin_token}
{
  "hardware_address": "46542",
  "name": "Main Building - Floor 1",
  "area": "Area A",
  "building": "Building 1",
  "floor": "Floor 1",
  "assigned_user_ids": [2]
}
```

### 4. Send Device Data (Hardware)
```json
POST http://127.0.0.1:8000/api/device-data/
{
  "device": 1,
  "parameters": {
    "v": 230.5,
    "a": 5.2,
    "pf": 0.95,
    "hz": 50.1,
    "tkW": 1.2
  }
}
```

### 5. List Devices
```json
GET http://127.0.0.1:8000/api/devices/
Headers: Authorization: Bearer {access_token}
```

---

## 📝 Notes

- **Hardware Address**: Must be exactly 5 digits (validated)
- **Parameter Mapping**: Maps hardware JSON keys to UI labels
- **Device Assignment**: Users can only see devices assigned to them
- **Device Data**: Hardware can send data without authentication
- **Historical Data**: Stored in `DeviceData` model for Module 6

---

## 🔒 Permission Summary

| Endpoint | Super Admin | Admin | User |
|----------|-------------|-------|------|
| List Devices | ✅ All | ✅ All | ✅ Assigned only |
| Create Device | ✅ | ✅ | ❌ |
| Update Device | ✅ | ✅ | ❌ |
| Delete Device | ✅ | ❌ | ❌ |
| List Parameter Mappings | ✅ | ✅ (read) | ✅ (read) |
| Create/Update/Delete Mapping | ✅ | ❌ | ❌ |
| Create Device Data | ✅ (public) | ✅ (public) | ✅ (public) |
| List Device Data | ✅ All | ✅ All | ✅ Assigned only |
