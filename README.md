# IoT Energy Monitoring System

A comprehensive, production-ready IoT Energy Monitoring System with real-time data visualization, MQTT integration, device management, and advanced reporting capabilities.

## 🚀 Features

### Core Functionality
- **Real-time Data Monitoring**: Live data streaming via MQTT with automatic device registration
- **Device Management**: Complete CRUD operations for IoT devices with MQTT configuration
- **User Management**: Role-based access control (Super Admin, Admin, User)
- **Historical Data & Reports**: Flexible time-range filtering with CSV export
- **Interactive Charts**: Real-time scrolling wave charts with parameter selection
- **Alarm System**: Threshold-based alerts with visual indicators
- **Parameter Mapping**: Dynamic mapping of device parameters to user-friendly labels

### Technical Highlights
- **Backend**: Django REST Framework with JWT authentication
- **Frontend**: React.js with TypeScript and Tailwind CSS
- **Real-time**: MQTT integration for continuous data ingestion
- **Charts**: Recharts for enterprise-level data visualization
- **Responsive**: Mobile-friendly UI with modern design

## 📁 Project Structure

```
Energy-Monitoring-System/
├── backend/                 # Django REST API
│   ├── accounts/           # Authentication & User Management
│   ├── devices/            # Device Management & MQTT Integration
│   ├── device_data/         # Historical Data Storage
│   ├── parameter_mapping/   # Parameter Key Mapping
│   ├── thresholds/          # Threshold & Alarm Management
│   ├── iot_energy_monitor/  # Django Project Settings
│   ├── requirements.txt    # Python Dependencies
│   └── README.md           # Backend Documentation
│
├── iot-energy-monitor/     # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI Components
│   │   ├── pages/          # Page Components
│   │   ├── contexts/       # React Context Providers
│   │   └── lib/            # API & Utilities
│   ├── package.json        # Node Dependencies
│   └── README.md          # Frontend Documentation
│
└── README.md              # This file
```

## 🛠️ Setup Instructions

### Prerequisites
- Python 3.8+ (for backend)
- Node.js 14+ and npm (for frontend)
- Git

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create super admin**
   ```bash
   python manage.py createsuperadmin
   ```

6. **Start development server**
   ```bash
   python manage.py runserver
   ```
   Backend will run on `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd iot-energy-monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```
   Frontend will run on `http://localhost:3000`

## 🔐 Default Credentials

After initial setup, create users via Django admin or API:
- **Super Admin**: Full system access
- **Admin**: Device and user management
- **User**: View-only access to assigned devices

## 📡 MQTT Integration

The system automatically:
- Subscribes to MQTT topics when devices are registered
- Captures real-time data and stores it in the database
- Updates device status based on last data received
- Supports per-device MQTT configuration (broker, topic, TLS)

See `backend/MQTT_SETUP.md` for detailed MQTT configuration.

## 📊 Key Features

### Device Registration
- Manual device registration
- MQTT-based automatic device discovery
- Field mapping for device parameters
- Per-device MQTT configuration

### Real-time Dashboard
- Live device status monitoring
- Parameter visualization
- Device search and filtering
- Table and grid view modes

### Historical Data & Charts
- Flexible time range selection (1hr to 30 days)
- Multi-parameter chart visualization
- Real-time scrolling wave charts
- CSV report generation with date/time filters

### User Management
- Role-based access control
- User assignment to devices
- Permission management

## 🧪 Testing

### Backend API Testing
```bash
cd backend
python manage.py test
```

### Frontend Testing
```bash
cd iot-energy-monitor
npm test
```

## 📦 Production Deployment

### Backend
1. Set `DEBUG=False` in `settings.py`
2. Configure `ALLOWED_HOSTS`
3. Set up proper database (PostgreSQL recommended)
4. Configure static files serving
5. Set up MQTT broker credentials

### Frontend
1. Build production bundle:
   ```bash
   npm run build
   ```
2. Serve `build/` directory with a web server (nginx, Apache, etc.)
3. Configure API endpoint in environment variables

## 🔧 Configuration

### Environment Variables (Backend)
- `SECRET_KEY`: Django secret key
- `DEBUG`: Debug mode (True/False)
- `DATABASE_URL`: Database connection string
- `MQTT_AUTO_START`: Auto-start MQTT subscriber (True/False)

### API Configuration (Frontend)
Update `src/lib/apiClient.ts` with your backend URL if different from default.

## 📝 API Documentation

API endpoints are documented in `backend/README.md`. Key endpoints:

- `/api/auth/login/` - User authentication
- `/api/devices/` - Device management
- `/api/device-data/list/` - Historical data retrieval
- `/api/mqtt/test/` - MQTT connection testing
- `/api/mqtt/register-device/` - MQTT device registration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Authors

- **Development Team** - Initial work

## 🙏 Acknowledgments

- Django REST Framework
- React.js Community
- Recharts for charting
- paho-mqtt for MQTT integration

## 📞 Support

For issues and questions, please open an issue on GitHub or contact the development team.

---

**Note**: This is a production-ready enterprise-level IoT Energy Monitoring System with comprehensive features for monitoring, managing, and reporting on energy consumption across multiple devices.
