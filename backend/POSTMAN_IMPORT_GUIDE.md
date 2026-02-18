# Postman Collection Import Guide

## 📦 Files Included

1. **IoT_Energy_Monitoring_API.postman_collection.json** - Complete API collection
2. **IoT_Energy_Monitoring_API.postman_environment.json** - Environment variables

## 🚀 How to Import

### Step 1: Import Collection

1. Open Postman
2. Click **Import** button (top left)
3. Click **Upload Files**
4. Select `IoT_Energy_Monitoring_API.postman_collection.json`
5. Click **Import**

### Step 2: Import Environment

1. Click **Import** button again
2. Select `IoT_Energy_Monitoring_API.postman_environment.json`
3. Click **Import**

### Step 3: Select Environment

1. Click the **Environments** dropdown (top right)
2. Select **"IoT Energy Monitoring - Local"**

## 📋 Collection Structure

The collection includes:

### 1. Root
- **API Root** - GET `/api/`

### 2. Authentication
- **Login** - Automatically saves tokens to environment
- **Register User (Super Admin)** - Create admin/user with Super Admin token
- **Register User (Admin)** - Create user with Admin token
- **Refresh Token** - Refresh access token

### 3. User Management
- **List Users** - Get all users (role-based)
- **Get Current User** - Get own profile
- **Update Current User** - Update own profile
- **Get User by ID** - Get specific user
- **Update User by ID** - Update user (role-based)
- **Delete User** - Delete user (Super Admin only)

### 4. Test Sequences
- Pre-configured test flow with automatic token saving

## 🔑 Environment Variables

The collection uses these variables:

- `{{base_url}}` - API base URL (default: http://127.0.0.1:8000)
- `{{access_token}}` - Current user's access token
- `{{refresh_token}}` - Current user's refresh token
- `{{super_admin_token}}` - Super Admin access token
- `{{admin_token}}` - Admin access token
- `{{user_token}}` - User access token

## 🎯 Quick Start

1. **Run "1. Login as Super Admin"** from Test Sequences
   - This automatically saves `super_admin_token` to environment

2. **Run "2. Register Admin (Super Admin)"**
   - Creates an admin user

3. **Run "4. Login as Admin"**
   - Saves `admin_token` to environment

4. **Run "5. Register User (Admin)"**
   - Admin creates a user account

## ✨ Features

- **Auto Token Saving**: Login requests automatically save tokens
- **Pre-configured Headers**: All requests have proper headers
- **Role-based Examples**: Separate requests for each role
- **Test Sequences**: Step-by-step workflow included

## 📝 Notes

- Update `base_url` in environment if your server runs on different port
- Tokens are automatically saved after login
- Use Test Sequences folder for step-by-step testing
- All authentication headers are pre-configured
