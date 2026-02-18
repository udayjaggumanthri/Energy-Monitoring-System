# IoT Energy Monitoring System - Backend API

Django REST Framework backend for the IoT Energy Monitoring System.

## Module 1: Authentication & Role-Permission Matrix ✅

This module implements:
- **Super Admin**: Full access, can register Admin/User accounts, manage all users
- **Admin**: Access to device registration, user management (view only), threshold settings
- **User**: View-only access to assigned devices and download reports

### ⚠️ Important: User Registration Policy

- **Only Super Admin can register users** via API
- **Admin and User cannot self-register**
- **Super Admin must be created using Django command** (not via API)

---

## Project Structure

```
backend/
├── accounts/              # Module 1: Authentication & User Management
│   ├── models.py         # Custom User model with roles
│   ├── serializers.py    # User serializers
│   ├── views.py          # Authentication views
│   ├── urls.py           # URL routing
│   ├── admin.py          # Admin interface
│   └── management/
│       └── commands/
│           └── createsuperadmin.py  # Custom command to create Super Admin
├── iot_energy_monitor/    # Django project settings
├── venv/                  # Virtual environment
├── manage.py
├── requirements.txt
└── README.md
```

---

## Setup Instructions

### 1. Activate Virtual Environment

**Windows:**
```bash
cd e:\suy\backend
.\venv\Scripts\activate
```

**Linux/Mac:**
```bash
cd backend
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Migrations

```bash
python manage.py migrate
```

### 4. Create First Super Admin

**Option 1: Using custom command**
```bash
python manage.py createsuperadmin
```

**Option 2: Using Django's createsuperuser**
```bash
python manage.py createsuperuser
# Then manually set role='super_admin' in Django admin or shell
```

**Option 3: Using Django shell**
```bash
python manage.py shell
```
```python
from accounts.models import User
user = User.objects.create_user('superadmin', 'superadmin@example.com', 'password')
user.role = 'super_admin'
user.is_staff = True
user.is_superuser = True
user.save()
```

### 5. Run Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

---

## API Endpoints - Module 1

### Root
- **GET** `/` - API information

### Authentication (`/api/auth/`)

#### Login (Public)
- **POST** `/api/auth/login/`
- **Body:**
```json
{
  "email_or_mobile": "admin@example.com",
  "password": "password"
}
```
- **Response:** User data + JWT tokens

#### Register User (Super Admin Only)
- **POST** `/api/auth/register/`
- **Authentication Required:** Yes (Super Admin token)
- **Body:**
```json
{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "mobile": "1234567890",
  "role": "admin"
}
```
- **Roles:** `admin`, `user` (Super Admin cannot be created via API)
- **Note:** Only Super Admin can register users

#### Refresh Token
- **POST** `/api/auth/token/refresh/`
- **Body:**
```json
{
  "refresh": "your_refresh_token"
}
```

#### List Users (Authenticated)
- **GET** `/api/auth/users/`
- **Permission:** 
  - Super Admin & Admin: See all users
  - User: See only themselves

#### Current User
- **GET** `/api/auth/users/me/` - Get current user
- **PUT** `/api/auth/users/me/` - Update current user (cannot change role)

#### User Detail (Role-based)
- **GET** `/api/auth/users/{id}/` - Get user details
- **PUT** `/api/auth/users/{id}/` - Update user (role-based permissions)
- **DELETE** `/api/auth/users/{id}/` - Delete user (Super Admin only)

---

## Role-Based Permissions

### Super Admin
- ✅ Can register Admin and User accounts via API
- ✅ Can view and manage all users
- ✅ Can delete users
- ✅ Can change user roles
- ✅ Full access to all endpoints
- ❌ Cannot create Super Admin via API (must use command)

### Admin
- ❌ Cannot register themselves or other users
- ✅ Can view all users (read-only)
- ✅ Can update users (except Super Admins)
- ❌ Cannot delete users
- ❌ Cannot change user roles

### User
- ❌ Cannot register themselves or other users
- ✅ Can view only their own profile
- ✅ Can update only their own profile (except role)
- ❌ Cannot view or manage other users

---

## Testing with Postman

### Step 1: Create Super Admin (One-time setup)

```bash
python manage.py createsuperadmin
# Or use Django's createsuperuser command
```

### Step 2: Login as Super Admin

```json
POST http://127.0.0.1:8000/api/auth/login/
{
  "email_or_mobile": "superadmin@example.com",
  "password": "password"
}
```

**Save the `access_token` from response**

### Step 3: Register Admin User (Super Admin only)

```json
POST http://127.0.0.1:8000/api/auth/register/
Headers: Authorization: Bearer {access_token_from_step_2}
Body: {
  "username": "admin",
  "email": "admin@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "role": "admin"
}
```

### Step 4: Register Regular User (Super Admin only)

```json
POST http://127.0.0.1:8000/api/auth/register/
Headers: Authorization: Bearer {access_token_from_step_2}
Body: {
  "username": "user",
  "email": "user@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "role": "user"
}
```

### Step 5: Test Permission Restrictions

**Try registering as Admin (should fail):**
```json
POST http://127.0.0.1:8000/api/auth/register/
Headers: Authorization: Bearer {admin_access_token}
Body: {...}
```
**Expected:** 403 Forbidden - "Only Super Admin can register new users"

---

## Security Features

1. **Registration Restriction**: Only Super Admin can register users
2. **Role Protection**: Users cannot change their own role
3. **Super Admin Protection**: Super Admin role cannot be created/changed via API
4. **Password Hashing**: All passwords stored securely
5. **JWT Authentication**: Secure token-based authentication
6. **CORS Protection**: Only allows requests from React app

---

## Next Steps

- Module 2: Device Registration & Parameter Mapping
- Module 3: Real-Time Dashboard
- Module 4: Hierarchical Grouping
- Module 5: Threshold & Alarm System
- Module 6: Historical Data & Reports
- Module 7: White-Labeling
