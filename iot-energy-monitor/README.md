# IoT Energy Monitoring System

A high-performance, real-time IoT Energy Monitoring Web Dashboard built with React JS, Tailwind CSS, and Shadcn UI components. The system monitors energy parameters (Voltage, Current, Power Factor, Frequency, Total kW) for 200+ devices with real-time updates via REST API.

## Features

### Module 1: Authentication & Role-Permission Matrix
- Login system with Email/Mobile Number
- Three distinct roles:
  - **Super Admin**: Access to White-labeling, Parameter Key Configuration, and full Admin management
  - **Admin**: Access to Device Registration, User Management, Threshold Settings, and Grouped Dashboards
  - **User**: View-only access to assigned meter dashboard and Download Reports

### Module 2: Dynamic Parameter Mapping & Device Registry
- Device registration using 5-digit hardware back-address
- User-friendly name assignment
- Key-Value Mapping UI for Super Admin to map JSON keys to UI labels (meter-agnostic)

### Module 3: Real-Time High-Density Dashboard
- Centralized grid view displaying 200+ device cards
- Real-time parameter updates (Voltage, Current, PF, Hz, Total kW)
- Entity Bar showing last data packet timestamp for connectivity verification

### Module 4: Hierarchical Grouping & Aggregation Engine
- Tree-structure grouping: Area → Building → Floor
- Aggregation utility calculating Total kW for groups
- Configurable aggregation (Sum/Average) for Total kW parameter

### Module 5: Thresholding & Alarm System
- Min/Max threshold limits for up to 20 parameters per device
- Visual alerts when thresholds are breached
- Alarm acknowledgement system
- Email trigger (integrate with real service when available)

### Module 6: Historical Data & Reporting
- 15 days of historical data display
- CSV export functionality with:
  - Device selection
  - Time range selection (From-To)
  - Timestamped records of all energy parameters

### Module 7: White-Labeling (Super Admin)
- Company logo upload
- System title/branding customization
- Global application branding

## Tech Stack

- **Frontend**: React JS with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix UI primitives)
- **State Management**: React Context API
- **Routing**: React Router DOM
- **Data Handling**: REST API (Django DRF backend; branding via API from Module 8; thresholds/alarms from API)
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd iot-energy-monitor
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Test Accounts

- **Super Admin**: 
  - Email: `superadmin@example.com`
  - Password: `password`

- **Admin**: 
  - Email: `admin@example.com`
  - Password: `password`

- **User**: 
  - Email: `user@example.com`
  - Password: `password`

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components (Button, Input, Card, Dialog)
│   └── Layout.tsx    # Main layout with navigation
├── contexts/
│   └── AppContext.tsx # Global state management
├── lib/
│   ├── api.ts        # API service layer (Module 1 & 2 use Django backend)
│   ├── utils.ts      # Utility functions
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── DeviceRegistration.tsx
│   ├── ParameterMapping.tsx
│   ├── ThresholdSettings.tsx
│   ├── AlarmManagement.tsx
│   ├── UserManagement.tsx
│   ├── GroupedDashboards.tsx
│   ├── Reports.tsx
│   └── WhiteLabeling.tsx
└── App.tsx           # Main app component with routing
```

## Key Features Implementation

### Real-Time Updates
- Devices are polled every 2 seconds via REST API
- State is managed globally using React Context
- Optimized rendering for 200+ device cards

### Dynamic Parameter Mapping
- Hardware sends JSON with keys like `{"v": 230, "a": 5}`
- Super Admin maps `v` → "Voltage", `a` → "Current"
- Dashboard displays user-friendly labels dynamically

### Hierarchical Grouping
- Devices can be organized by Area → Building → Floor
- Total kW is aggregated at group levels
- Expandable tree view for navigation

### Alarm System
- Thresholds can be set per device and parameter
- Visual indicators on dashboard cards
- Dedicated alarm management page with acknowledgement

## Future Integration

The system is designed to integrate with:
- **Django DRF Backend**: REST APIs for history/settings
- **MQTT/WebSockets**: For live data streaming (currently using REST polling)
- **Real Email Service**: Replace placeholder email triggers

## Performance Considerations

- React Context for global state management
- Optimized re-renders using React.memo where appropriate
- Efficient grid layout for high-density device display
- Polling interval configurable (currently 2 seconds)

## License

This project is a prototype for IoT Energy Monitoring System.
