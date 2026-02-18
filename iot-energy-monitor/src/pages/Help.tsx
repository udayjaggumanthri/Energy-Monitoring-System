import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
  HelpCircle,
  LayoutDashboard,
  Zap,
  Users,
  AlertTriangle,
  Building2,
  Download,
  MapPin,
  Palette,
  LogIn,
  Shield,
  ChevronRight,
} from 'lucide-react';

const sections = [
  {
    title: 'Getting started',
    icon: LogIn,
    steps: [
      'Sign in with your email or mobile number and password.',
      'If you don’t have an account, ask your Admin or Super Admin to create one.',
      'After login you’ll see the Dashboard with an overview of devices and alarms.',
    ],
  },
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    steps: [
      'View total devices, online devices, active alarms, and total power.',
      'Each device card shows live parameters (e.g. voltage, current) and last update time.',
      'Green bar = device online (data in last 10 seconds). Grey = offline.',
      'Red border = device has unacknowledged alarms.',
    ],
  },
  {
    title: 'Devices (Admin / Super Admin only)',
    icon: Zap,
    steps: [
      'Register a device with a 5-digit hardware address and name.',
      'Optionally set Area, Building, and Floor for grouping.',
      'Assign users to a device so they can see it on the Dashboard and in Reports.',
      'Edit or delete devices from the list.',
    ],
  },
  {
    title: 'User management (Admin / Super Admin only)',
    icon: Users,
    steps: [
      'Create users: choose role (Admin or User), username, email or mobile, and password.',
      'Admins can create only User accounts; Super Admins can create Admin or User.',
      'Assign devices to users so they see only their assigned devices on Dashboard and Reports.',
      'Edit user details or deactivate accounts as needed.',
    ],
  },
  {
    title: 'Parameter mapping (Super Admin only)',
    icon: MapPin,
    steps: [
      'Map hardware keys (e.g. v, a, pf) to display labels (e.g. Voltage, Current, Power Factor).',
      'These labels appear on the Dashboard and in Reports.',
      'Add a new mapping: Hardware key (from device data) and Display label (what users see).',
    ],
  },
  {
    title: 'Threshold settings (Admin / Super Admin only)',
    icon: AlertTriangle,
    steps: [
      'Set min/max limits per device and parameter (e.g. Voltage min 200, max 250).',
      'When live data goes outside these limits, an alarm is created automatically.',
      'At least one of minimum or maximum must be set for each threshold.',
    ],
  },
  {
    title: 'Alarms (Admin / Super Admin only)',
    icon: AlertTriangle,
    steps: [
      'View unacknowledged and acknowledged alarms.',
      'Alarms are created by the system when a threshold is breached.',
      'Click Acknowledge to mark an alarm as handled.',
    ],
  },
  {
    title: 'Grouped dashboards (Admin / Super Admin only)',
    icon: Building2,
    steps: [
      'See devices grouped by Area → Building → Floor with total power per group.',
      'Devices must have Area, Building, and Floor set to appear here.',
      'Expand a floor to see device list and current parameters.',
    ],
  },
  {
    title: 'Reports (All roles)',
    icon: Download,
    steps: [
      'Select a device and date range, then download historical data as CSV.',
      'Regular users see only devices assigned to them.',
      'Data is retained for the last 15 days.',
    ],
  },
  {
    title: 'White-labeling (Super Admin only)',
    icon: Palette,
    steps: [
      'Set the system title and upload a company logo.',
      'Changes appear in the sidebar and on the login page.',
      'Logo: PNG, JPG, SVG or GIF, max 2MB.',
    ],
  },
  {
    title: 'Roles and permissions',
    icon: Shield,
    steps: [
      'Super Admin: Full access; can create Admins and Users; configure mappings and branding.',
      'Admin: Create Users; manage devices, thresholds, alarms; view grouped dashboards and reports.',
      'User: View Dashboard and Reports only for assigned devices; cannot create or edit others.',
    ],
  },
];

const Help: React.FC = () => {
  const { user } = useApp();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <HelpCircle className="h-10 w-10 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">How to use this application</h1>
            <p className="text-slate-600">
              A short guide for everyone—from first-time users to admins. Use the sections below to find what you need.
            </p>
            {user && (
              <p className="text-sm text-slate-500 mt-2">
                You are signed in as <span className="font-medium text-slate-700">{user.name || user.username}</span> (
                <span className="capitalize">{user.role?.replace('_', ' ')}</span>).
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-blue-600" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  {section.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-slate-700">
                      <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Help;
