# Postman API Endpoints - Module 1

**Base URL:** `http://127.0.0.1:8000`

## ⚠️ Important: Registration Policy

- **Only Super Admin can register users** via API
- **Admin and User cannot self-register**
- **Super Admin must be created using:** `python manage.py createsuperadmin`

---

## 🔹 Root Endpoint

**GET** `/`
- No authentication required
- Returns API information

---

## 🔹 Authentication Endpoints

### 1. Login (Public)
**POST** `/api/auth/login/`

**Body (JSON):**
```json
{
  "email_or_mobile": "superadmin@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "superadmin",
    "email": "superadmin@example.com",
    "role": "super_admin",
    ...
  },
  "tokens": {
    "refresh": "...",
    "access": "..."
  }
}
```

---

### 2. Register User (Super Admin Only) ⚠️

**POST** `/api/auth/register/`

**Headers:**
```
Authorization: Bearer {super_admin_access_token}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "mobile": "1234567890",
  "role": "admin",
  "first_name": "New",
  "last_name": "Admin"
}
```

**Allowed Roles:** `admin`, `user` (NOT `super_admin`)

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {...},
  "tokens": {
    "refresh": "...",
    "access": "..."
  },
  "note": "New user can login with these credentials"
}
```

**Error Responses:**
- **403 Forbidden** (if not Super Admin):
```json
{
  "error": "Permission denied",
  "message": "Only Super Admin can register new users. Please contact your Super Admin."
}
```

- **400 Bad Request** (if trying to create Super Admin):
```json
{
  "error": "Invalid role",
  "message": "Super Admin users cannot be created via API. Use Django createsuperuser command instead."
}
```

---

### 3. Refresh Token
**POST** `/api/auth/token/refresh/`

**Body (JSON):**
```json
{
  "refresh": "your_refresh_token_here"
}
```

**Response:**
```json
{
  "access": "new_access_token"
}
```

---

### 4. List Users (Authenticated)
**GET** `/api/auth/users/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Permission:**
- Super Admin & Admin: See all users
- User: See only themselves

**Response:**
```json
{
  "count": 3,
  "results": [
    {
      "id": 1,
      "username": "superadmin",
      "email": "superadmin@example.com",
      "role": "super_admin",
      ...
    }
  ]
}
```

---

### 5. Current User
**GET** `/api/auth/users/me/`
**PUT** `/api/auth/users/me/`

**Headers:**
```
Authorization: Bearer {access_token}
```

**PUT Restrictions:**
- Cannot change own role
- Cannot change email (if unique constraint exists)

---

### 6. User Detail (Role-based)
**GET** `/api/auth/users/{id}/`
**PUT** `/api/auth/users/{id}/`
**DELETE** `/api/auth/users/{id}/` (Super Admin only)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Permissions:**
- Super Admin: Full access to all users
- Admin: Can view/update users (except Super Admins), cannot delete
- User: Can only access their own profile

---

## 🚀 Complete Test Sequence

### 1. Create Super Admin (One-time, via command)
```bash
python manage.py createsuperadmin
# Or: python manage.py createsuperuser
```

### 2. Login as Super Admin
```json
POST http://127.0.0.1:8000/api/auth/login/
{
  "email_or_mobile": "superadmin@example.com",
  "password": "password"
}
```
**Save the `access_token`**

### 3. Register Admin User (Super Admin only)
```json
POST http://127.0.0.1:8000/api/auth/register/
Headers: Authorization: Bearer {super_admin_token}
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "role": "admin"
}
```

### 4. Register Regular User (Super Admin only)
```json
POST http://127.0.0.1:8000/api/auth/register/
Headers: Authorization: Bearer {super_admin_token}
{
  "username": "user",
  "email": "user@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "role": "user"
}
```

### 5. Test Permission Restriction
**Try registering as Admin (should fail):**
```json
POST http://127.0.0.1:8000/api/auth/register/
Headers: Authorization: Bearer {admin_token}
{
  "username": "test",
  "email": "test@test.com",
  "password": "test123",
  "password_confirm": "test123",
  "role": "user"
}
```
**Expected:** 403 Forbidden

---

## 📝 Postman Setup

1. **Create Environment Variables:**
   - `base_url`: `http://127.0.0.1:8000`
   - `super_admin_token`: (set after Super Admin login)
   - `admin_token`: (set after Admin login)
   - `user_token`: (set after User login)

2. **In Authorization tab:**
   - Select "Bearer Token"
   - Use `{{super_admin_token}}` for Super Admin requests
   - Use `{{admin_token}}` for Admin requests

3. **Test Registration Restriction:**
   - Try registering with Admin token → Should fail
   - Try registering with User token → Should fail
   - Only Super Admin token should work

---

## 🔒 Security Notes

- Registration endpoint requires Super Admin authentication
- Admin and User roles cannot register via API
- Super Admin role cannot be created via API (use command)
- Users cannot change their own role
- Only Super Admin can change user roles
