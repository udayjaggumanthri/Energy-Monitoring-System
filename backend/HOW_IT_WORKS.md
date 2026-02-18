# How Module 1 Works - Complete Explanation

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Postman/React)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP Requests
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Django REST Framework (DRF)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   URLs       │→ │    Views     │→ │ Serializers  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         └──────────────────┼──────────────────┘            │
│                            ▼                                 │
│                    ┌──────────────┐                         │
│                    │   Models     │                         │
│                    │  (Database)  │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 1. Project Structure

```
backend/
├── iot_energy_monitor/     # Django Project Settings
│   ├── settings.py          # Configuration (DB, CORS, JWT, etc.)
│   └── urls.py             # Main URL routing
├── accounts/                # Module 1: Authentication App
│   ├── models.py           # User model (database structure)
│   ├── serializers.py      # Data validation & conversion
│   ├── views.py            # API endpoints logic
│   ├── urls.py             # URL patterns for this app
│   └── admin.py            # Django admin interface
└── manage.py               # Django management script
```

---

## 🔐 2. Authentication Flow

### Step-by-Step Login Process:

```
1. Client sends POST request to /api/auth/login/
   ↓
2. LoginView receives request
   ↓
3. LoginSerializer validates input (email/mobile + password)
   ↓
4. System searches for user by:
   - Email (first)
   - Mobile number (second)
   - Username (third)
   ↓
5. If user found:
   - Check password using Django's password hashing
   - Verify user is active
   ↓
6. Generate JWT tokens:
   - Access Token (valid for 1 hour)
   - Refresh Token (valid for 7 days)
   ↓
7. Return user data + tokens to client
```

### Code Flow Example:

```python
# 1. Request comes in
POST /api/auth/login/
Body: {"email_or_mobile": "admin@example.com", "password": "password"}

# 2. URLs route to view
urls.py → path('login/', LoginView.as_view())

# 3. View processes request
LoginView.post() → validates → finds user → checks password → generates tokens

# 4. Response sent back
{
  "user": {...},
  "tokens": {"access": "...", "refresh": "..."}
}
```

---

## 🎭 3. Role-Based Permission System

### Three Roles Defined:

1. **Super Admin** (`super_admin`)
   - Full access to everything
   - Can delete users
   - Can manage all settings

2. **Admin** (`admin`)
   - Can manage users (except Super Admins)
   - Can register devices
   - Cannot delete users

3. **User** (`user`)
   - Can only see their own data
   - Can view assigned devices
   - Cannot manage other users

### How Permissions Work:

```python
# In User Model (models.py)
@property
def is_super_admin(self):
    return self.role == 'super_admin'

def has_role(self, *roles):
    return self.role in roles

# In Views (views.py)
def get_queryset(self):
    user = self.request.user
    if user.has_role('super_admin', 'admin'):
        return User.objects.all()  # See all users
    return User.objects.filter(id=user.id)  # See only self
```

### Permission Flow:

```
Request comes in with JWT token
    ↓
Middleware extracts token → validates → gets user
    ↓
View checks user.role
    ↓
Based on role:
  - Super Admin → Full access
  - Admin → Limited access
  - User → Self-only access
```

---

## 🔑 4. JWT Token Authentication

### What is JWT?

JWT (JSON Web Token) is a secure way to authenticate users without storing sessions.

### Token Structure:

```
Header.Payload.Signature

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE2...
│         │         │
│         │         └─ Signature (verifies token authenticity)
│         └─ Payload (user ID, expiration, etc.)
└─ Header (algorithm type)
```

### How Tokens Work:

1. **Login** → Server generates tokens
2. **Client stores** tokens (localStorage/memory)
3. **Every request** includes token in header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. **Server validates** token → extracts user info
5. **Request processed** with user context

### Token Lifecycle:

```
Login → Get Access Token (1 hour) + Refresh Token (7 days)
    ↓
Use Access Token for API calls
    ↓
When Access Token expires → Use Refresh Token to get new Access Token
    ↓
When Refresh Token expires → User must login again
```

---

## 📊 5. Database Model (User)

### Model Structure:

```python
class User(AbstractUser):
    # Inherits from Django's AbstractUser:
    # - username, password, first_name, last_name
    # - is_active, is_staff, is_superuser
    # - date_joined, last_login
    
    # Custom fields:
    email = EmailField(unique=True)      # Required, unique
    mobile = CharField(max_length=15)    # Optional
    role = CharField(choices=ROLE_CHOICES)  # super_admin/admin/user
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### Database Table:

```
users table:
┌────┬───────────┬──────────────────┬──────────┬─────────────┐
│ id │ username  │ email            │ role     │ created_at  │
├────┼───────────┼──────────────────┼──────────┼─────────────┤
│ 1  │ superadmin│ superadmin@...   │super_admin│ 2026-01-26 │
│ 2  │ admin     │ admin@example.com│ admin    │ 2026-01-26 │
│ 3  │ user      │ user@example.com │ user     │ 2026-01-26 │
└────┴───────────┴──────────────────┴──────────┴─────────────┘
```

---

## 🔄 6. Request-Response Flow

### Complete Example: User Registration

```
┌─────────────┐
│   Client    │ POST /api/auth/register/
│  (Postman)  │ Body: {username, email, password, ...}
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Django URL Router (urls.py)             │
│ Matches: /api/auth/register/            │
│ Routes to: accounts.urls                │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ accounts.urls                           │
│ path('register/', RegisterView)        │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ RegisterView (views.py)                 │
│ 1. Gets serializer                      │
│ 2. Validates data                       │
│ 3. Checks if user exists                │
│ 4. Creates new user                     │
│ 5. Generates JWT tokens                 │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ UserRegistrationSerializer              │
│ - Validates password match              │
│ - Validates email format                │
│ - Converts JSON → User object           │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ User Model (models.py)                  │
│ - Saves to database                     │
│ - Hashes password                       │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Response  │ {user: {...}, tokens: {...}}
│   to Client │ Status: 201 Created
└─────────────┘
```

---

## 🛡️ 7. Security Features

### Password Security:

```python
# Passwords are NEVER stored in plain text
user.set_password("password123")
# Stored as: pbkdf2_sha256$260000$hash...

# When checking:
user.check_password("password123")  # Returns True/False
# Django automatically hashes and compares
```

### JWT Security:

1. **Signed with SECRET_KEY** - Cannot be tampered with
2. **Expiration** - Tokens expire automatically
3. **Refresh Rotation** - Old refresh tokens become invalid
4. **Bearer Token** - Must be in Authorization header

### CORS Protection:

```python
# Only allows requests from:
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React app
    "http://127.0.0.1:3000",
]
# Blocks requests from other origins
```

---

## 📝 8. Serializers Explained

### What are Serializers?

Serializers convert between:
- **JSON** (from client) ↔ **Python Objects** (Django models)
- **Python Objects** → **JSON** (to client)

### Example: UserRegistrationSerializer

```python
# Input (JSON from client):
{
  "username": "test",
  "email": "test@test.com",
  "password": "pass123",
  "password_confirm": "pass123"
}

# Serializer validates:
✅ Username format
✅ Email format
✅ Password strength
✅ Passwords match

# Output (Python object):
User(username="test", email="test@test.com", ...)

# Then saves to database
```

---

## 🎯 9. View Classes Explained

### Different View Types:

1. **Function-Based Views** (`@api_view`)
   ```python
   @api_view(['GET'])
   def api_root(request):
       return Response({...})
   ```

2. **Class-Based Views** (`generics.GenericAPIView`)
   ```python
   class LoginView(generics.GenericAPIView):
       def post(self, request):
           # Handle POST request
   ```

3. **Generic Views** (`generics.ListAPIView`)
   ```python
   class UserListView(generics.ListAPIView):
       # Automatically handles GET request
       # Returns list of users
   ```

### Permission Classes:

```python
permission_classes = [AllowAny]        # No auth required
permission_classes = [IsAuthenticated] # Must be logged in
permission_classes = [IsAdminUser]     # Must be admin
```

---

## 🔍 10. Real Example Flow

### Scenario: User wants to see list of users

```
1. User logs in:
   POST /api/auth/login/
   → Gets access_token: "eyJhbGciOiJIUzI1NiIs..."

2. User requests user list:
   GET /api/auth/users/
   Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

3. Django middleware:
   - Extracts token from header
   - Validates token signature
   - Extracts user_id from token
   - Loads user from database
   - Attaches user to request object

4. View receives request:
   request.user = User(id=1, role='super_admin')

5. View checks permissions:
   if user.has_role('super_admin', 'admin'):
       return all users
   else:
       return only current user

6. Serializer converts:
   User objects → JSON format

7. Response sent:
   {
     "count": 3,
     "users": [
       {"id": 1, "username": "superadmin", ...},
       {"id": 2, "username": "admin", ...},
       {"id": 3, "username": "user", ...}
     ]
   }
```

---

## 🗄️ 11. Database Operations

### How Django ORM Works:

```python
# Instead of SQL:
SELECT * FROM users WHERE email = 'admin@example.com';

# Django ORM:
User.objects.get(email='admin@example.com')

# Create user:
User.objects.create_user(
    username='test',
    email='test@test.com',
    password='pass123'
)

# Filter users:
User.objects.filter(role='admin')  # All admins
User.objects.filter(is_active=True)  # Active users
```

---

## 🚀 12. Key Concepts Summary

### 1. **Models** = Database Tables
   - Define data structure
   - Handle database operations

### 2. **Serializers** = Data Converters
   - Validate input
   - Convert JSON ↔ Python objects

### 3. **Views** = API Endpoints
   - Handle HTTP requests
   - Process business logic
   - Return responses

### 4. **URLs** = Routing
   - Map URLs to views
   - Define API endpoints

### 5. **Permissions** = Access Control
   - Who can access what
   - Role-based restrictions

### 6. **JWT** = Authentication
   - Secure token-based auth
   - No server-side sessions

---

## 💡 Quick Reference

### To add a new endpoint:

1. **Define URL** in `accounts/urls.py`:
   ```python
   path('new-endpoint/', views.NewView.as_view())
   ```

2. **Create View** in `accounts/views.py`:
   ```python
   class NewView(generics.GenericAPIView):
       def get(self, request):
           return Response({"message": "Hello"})
   ```

3. **Test** in Postman:
   ```
   GET http://127.0.0.1:8000/api/auth/new-endpoint/
   ```

---

## 🎓 Learning Path

1. **Start here**: Models define your data
2. **Then**: Serializers validate and convert
3. **Then**: Views handle requests
4. **Finally**: URLs connect everything

This is the Django REST Framework pattern! 🚀
