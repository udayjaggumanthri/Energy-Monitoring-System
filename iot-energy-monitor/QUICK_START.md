# Quick Start Guide - Backend Integration

## ✅ What's Integrated

The frontend is now connected to the Django REST Framework backend for:

1. **Authentication** - Login, Logout, Token Management
2. **User Management** - Create, Read, Update, Delete users
3. **Role-Based Access Control** - Super Admin, Admin, User permissions

## 🚀 How to Run

### 1. Start Backend (Terminal 1)
```bash
cd backend
python manage.py runserver
```
Backend runs on: `http://127.0.0.1:8000`

### 2. Start Frontend (Terminal 2)
```bash
cd iot-energy-monitor
npm start
```
Frontend runs on: `http://localhost:3000`

### 3. Login
- Open `http://localhost:3000/login`
- Use test credentials:
  - **Super Admin**: `superadmin@example.com` / `password`
  - Or create users via Django admin or API

## 📝 Test Credentials

If you haven't created test users yet:

### Create Super Admin (One-time)
```bash
cd backend
python manage.py createsuperadmin
```

### Or use Django Admin
1. Go to `http://127.0.0.1:8000/admin/`
2. Login with super admin credentials
3. Create Admin/User accounts

## 🔑 Key Features

### Automatic Token Management
- JWT tokens are automatically stored and refreshed
- Tokens expire after 1 hour (auto-refresh)
- Automatic logout on token expiration

### User Management
- **Super Admin** can create Admin and User accounts
- **Admin** can create User accounts only
- Role-based UI access control

### API Client
- All API calls go through `apiClient` utility
- Automatic error handling
- Automatic token injection
- Automatic token refresh on 401 errors

## 📁 Files Changed

### New Files
- `src/lib/apiClient.ts` - API client with JWT handling
- `BACKEND_INTEGRATION.md` - Detailed integration guide

### Updated Files
- `src/lib/api.ts` - Updated authService and userService
- `src/pages/Login.tsx` - Uses real API
- `src/pages/UserManagement.tsx` - Uses real API
- `src/contexts/AppContext.tsx` - Handles JWT tokens
- `src/App.tsx` - Updated ProtectedRoute
- `src/components/Sidebar.tsx` - Updated logout

## 🐛 Troubleshooting

### CORS Error
- Ensure backend `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`
- Check backend is running

### Login Fails
- Check backend is running on port 8000
- Verify user exists in database
- Check browser console for errors

### Token Issues
- Clear `localStorage` and login again
- Check token expiration (1 hour for access token)
- Verify refresh token is valid (7 days)

## 📚 Next Steps

- Module 2: Device Registration API
- Module 2: Parameter Mapping API
- Module 5: Threshold & Alarm API
- Module 6: Historical Data API
- Module 7: White-Labeling API
