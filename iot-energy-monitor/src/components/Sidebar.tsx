import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  Download, 
  Building2, 
  Zap,
  MapPin,
  Palette,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { brandingService, authService } from '../lib/api';
import Button from './ui/Button';

const Sidebar: React.FC = () => {
  const { user, alarms, setUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [branding, setBranding] = React.useState({ logo: '', title: 'IoT Energy Monitoring System' });

  React.useEffect(() => {
    brandingService.getBranding().then(setBranding);
  }, []);

  const unacknowledgedAlarms = alarms.filter(a => !a.acknowledged).length;

  const menuItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      roles: ['super_admin', 'admin', 'user'],
      badge: null
    },
    { 
      path: '/devices', 
      label: 'Devices', 
      icon: Zap, 
      roles: ['super_admin', 'admin'],
      badge: null
    },
    { 
      path: '/users', 
      label: 'User Management', 
      icon: Users, 
      roles: ['super_admin', 'admin'],
      badge: null
    },
    { 
      path: '/thresholds', 
      label: 'Threshold Settings', 
      icon: AlertTriangle, 
      roles: ['super_admin', 'admin'],
      badge: null
    },
    { 
      path: '/alarms', 
      label: 'Alarms', 
      icon: AlertTriangle, 
      roles: ['super_admin', 'admin'],
      badge: unacknowledgedAlarms > 0 ? unacknowledgedAlarms : null
    },
    { 
      path: '/grouping', 
      label: 'Grouped Dashboards', 
      icon: Building2, 
      roles: ['super_admin', 'admin'],
      badge: null
    },
    { 
      path: '/reports', 
      label: 'Download Reports', 
      icon: Download, 
      roles: ['super_admin', 'admin', 'user'],
      badge: null
    },
    { 
      path: '/parameter-mapping', 
      label: 'Parameter Mapping', 
      icon: MapPin, 
      roles: ['super_admin'],
      badge: null
    },
    { 
      path: '/white-labeling', 
      label: 'White-Labeling', 
      icon: Palette, 
      roles: ['super_admin'],
      badge: null
    },
    { 
      path: '/help', 
      label: 'Help & How to use', 
      icon: HelpCircle, 
      roles: ['super_admin', 'admin', 'user'],
      badge: null
    },
  ].filter(item => user && item.roles.includes(user.role));

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl z-50">
      {/* Logo and Title Section */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          {branding.logo ? (
            <img src={branding.logo} alt="Logo" className="h-10 w-10 rounded-lg" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-white">{branding.title}</h1>
            <p className="text-xs text-slate-400">Energy Monitor</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3 mb-3 px-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ') || 'user'}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
