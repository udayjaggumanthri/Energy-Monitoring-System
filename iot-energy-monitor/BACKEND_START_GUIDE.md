# Backend Server Start Guide

## Issue
If you're seeing "Failed to fetch" errors in the frontend, it means the Django backend server is not running.

## Solution

### 1. Start the Django Backend Server

Open a terminal and navigate to the backend directory:

```powershell
cd e:\suy\backend
```

Activate the virtual environment (if not already activated):

```powershell
.\venv\Scripts\Activate.ps1
```

Start the Django development server:

```powershell
python manage.py runserver
```

You should see output like:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

### 2. Verify Backend is Running

Open your browser and navigate to:
- API Root: http://127.0.0.1:8000/api/
- Admin Panel: http://127.0.0.1:8000/admin/

If you see JSON responses, the backend is running correctly.

### 3. Frontend Configuration

The frontend is configured to connect to `http://127.0.0.1:8000/api` by default.

If your backend is running on a different port or URL, update the `.env` file:

```env
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

### 4. CORS Configuration

Make sure CORS is properly configured in `backend/iot_energy_monitor/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
```

### 5. Common Issues

**Port Already in Use:**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Virtual Environment Not Activated:**
Make sure you've activated the virtual environment before running the server.

**Database Not Migrated:**
```powershell
python manage.py migrate
```

**No Superuser Created:**
```powershell
python manage.py createsuperuser
```

## Quick Start Commands

```powershell
# Navigate to backend
cd e:\suy\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run migrations (if needed)
python manage.py migrate

# Start server
python manage.py runserver
```

The server will start on `http://127.0.0.1:8000/` and the frontend will automatically connect to it.
