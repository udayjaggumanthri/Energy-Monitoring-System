# Backend Integration Guide

## Overview

The frontend has been integrated with the Django REST Framework backend. Authentication and User Management endpoints are now connected to the real backend API.

## Configuration

### Environment Variables

Create a `.env` file in the `iot-energy-monitor` directory with the following:

```env
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

**Note:** The default API URL is `http://127.0.0.1:8000/api` if the environment variable is not set.

## Integrated Endpoints

### ✅ Authentication (Module 1)
- **Login**: `POST /api/auth/login/`
- **Register User**: `POST /api/auth/register/` (Super Admin only)
- **Refresh Token**: `POST /api/auth/token/refresh/`
- **Get Current User**: `GET /api/auth/users/me/`
- **Update Current User**: `PUT /api/auth/users/me/`
- **List Users**: `GET /api/auth/users/`
- **Get User by ID**: `GET /api/auth/users/{id}/`
- **Update User**: `PUT /api/auth/users/{id}/`
- **Delete User**: `DELETE /api/auth/users/{id}/` (Super Admin only)

### ⏳ Pending Backend (Future Modules)
- **Device Management** (Module 2) - Integrated with backend
- **Parameter Mapping** (Module 2) - Integrated with backend
- **Threshold Settings** (Module 5) - localStorage until backend API
- **Alarm Management** (Module 5) - localStorage until backend API
- **Historical Data** (Module 6) - Uses backend device-data list
- **White-Labeling** (Module 7) - localStorage until backend API

## Features

### JWT Token Management
- Access tokens are automatically stored in `localStorage`
- Tokens are automatically included in API requests
- Automatic token refresh on 401 errors
- Automatic logout and redirect to login if refresh fails

### User Authentication Flow
1. User enters email/mobile and password
2. Frontend calls `/api/auth/login/`
3. Backend returns user data and JWT tokens
4. Tokens are stored in `localStorage`
5. User data is stored in context and `localStorage`
6. All subsequent API requests include the access token

### User Management
- **Super Admin** can create Admin and User accounts
- **Admin** can create User accounts only
- **User** cannot create accounts
- Role-based access control is enforced on both frontend and backend

## Testing

### 1. Start Django Backend
```bash
cd backend
python manage.py runserver
```

### 2. Start React Frontend
```bash
cd iot-energy-monitor
npm start
```

### 3. Test Login
- Navigate to `http://localhost:3000/login`
- Use test credentials:
  - **Super Admin**: `superadmin@example.com` / `password`
  - **Admin**: `admin@example.com` / `password123` (if created)
  - **User**: `user@example.com` / `password123` (if created)

### 4. Test User Management
- Login as Super Admin
- Navigate to "User Management"
- Create a new Admin or User account
- Verify the user appears in the list

## API Client

The `apiClient` utility (`src/lib/apiClient.ts`) handles:
- Automatic token injection in headers
- Token refresh on 401 errors
- Error handling and response parsing
- Logout functionality

## Troubleshooting

### CORS Errors
If you see CORS errors, ensure:
1. Django backend has `corsheaders` installed
2. `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`
3. Backend is running on `http://127.0.0.1:8000`

### Authentication Errors
- Check browser console for API errors
- Verify tokens are stored in `localStorage`
- Check network tab for API request/response
- Ensure backend is running and accessible

### Token Refresh Issues
- Tokens expire after 1 hour (access) or 7 days (refresh)
- If refresh fails, user will be logged out automatically
- User needs to login again to get new tokens

## Next Steps

1. **Module 2**: Integrate Device Registration endpoints
2. **Module 2**: Integrate Parameter Mapping endpoints
3. **Module 5**: Integrate Threshold and Alarm endpoints
4. **Module 6**: Integrate Historical Data endpoints
5. **Module 7**: Integrate White-Labeling endpoints
