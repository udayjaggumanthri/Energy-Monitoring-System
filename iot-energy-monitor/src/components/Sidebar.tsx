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
  HelpCircle,
  X
} from 'lucide-react';
import { brandingService, authService } from '../lib/api';
import Button from './ui/Button';
import defaultLogo from '../logo with pf.png';
import { cn } from '../lib/utils';

type SidebarProps = {
  variant: 'desktop' | 'mobile';
  isOpen?: boolean;
  onClose?: () => void;
};

type MenuSection = 'Overview' | 'Operations' | 'Administration';

type MenuItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'super_admin' | 'admin' | 'user'>;
  badge: number | null;
  section: MenuSection;
};

const Sidebar: React.FC<SidebarProps> = ({ variant, isOpen = false, onClose }) => {
  const { user, alarms, setUser } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [branding, setBranding] = React.useState({ logo: '', title: 'IoT Monitoring System' });

  React.useEffect(() => {
    brandingService.getBranding().then(setBranding);
  }, []);

  const unacknowledgedAlarms = alarms.filter(a => !a.acknowledged).length;

  const allMenuItems: MenuItem[] = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      roles: ['super_admin', 'admin', 'user'],
      badge: null,
      section: 'Overview'
    },
    { 
      path: '/devices', 
      label: 'Devices', 
      icon: Zap, 
      roles: ['super_admin', 'admin'],
      badge: null,
      section: 'Operations'
    },
    { 
      path: '/users', 
      label: 'User Management', 
      icon: Users, 
      roles: ['super_admin', 'admin'],
      badge: null,
      section: 'Administration'
    },
    { 
      path: '/thresholds', 
      label: 'Threshold Settings', 
      icon: AlertTriangle, 
      roles: ['super_admin', 'admin'],
      badge: null,
      section: 'Operations'
    },
    { 
      path: '/alarms', 
      label: 'Alarms', 
      icon: AlertTriangle, 
      roles: ['super_admin', 'admin'],
      badge: unacknowledgedAlarms > 0 ? unacknowledgedAlarms : null
      ,
      section: 'Operations'
    },
    { 
      path: '/grouping', 
      label: 'Grouped Dashboards', 
      icon: Building2, 
      roles: ['super_admin', 'admin'],
      badge: null,
      section: 'Operations'
    },
    { 
      path: '/reports', 
      label: 'Download Reports', 
      icon: Download, 
      roles: ['super_admin', 'admin', 'user'],
      badge: null,
      section: 'Overview'
    },
    { 
      path: '/parameter-mapping', 
      label: 'Parameter Mapping', 
      icon: MapPin, 
      roles: ['super_admin'],
      badge: null,
      section: 'Administration'
    },
    { 
      path: '/white-labeling', 
      label: 'White-Labeling', 
      icon: Palette, 
      roles: ['super_admin'],
      badge: null,
      section: 'Administration'
    },
    { 
      path: '/help', 
      label: 'Help & How to use', 
      icon: HelpCircle, 
      roles: ['super_admin'],
      badge: null,
      section: 'Administration'
    },
  ];

  const menuItems = user ? allMenuItems.filter(item => item.roles.includes(user.role)) : [];

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate('/login');
    onClose?.();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const baseClasses =
    'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 shadow-2xl border-r border-white/10';

  const variantClasses =
    variant === 'desktop'
      ? 'fixed left-0 top-0 hidden h-full w-64 flex-col lg:flex z-40'
      : `fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col transform transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`;

  return (
    <aside
      className={`${baseClasses} ${variantClasses}`}
      role={variant === 'mobile' ? 'dialog' : undefined}
      aria-modal={variant === 'mobile' ? true : undefined}
      aria-hidden={variant === 'mobile' ? (!isOpen ? true : undefined) : undefined}
    >
      {/* Logo and Title Section */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {branding.logo ? (
              <img
                src={branding.logo}
                alt="Logo"
                className="h-16 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <img
                src={defaultLogo}
                alt="Logo"
                className="h-16 w-auto max-w-[180px] object-contain"
              />
            )}
          </div>

          {variant === 'mobile' && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content (menu + user) */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav>
          {(['Overview', 'Operations', 'Administration'] as const).map((section) => {
            const sectionItems = menuItems.filter(i => i.section === section);
            if (sectionItems.length === 0) return null;

            return (
              <div key={section} className="mb-5 last:mb-0">
                <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  {section}
                </p>
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigate(item.path)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50',
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={cn(
                              'h-8 w-8 rounded-md flex items-center justify-center transition-colors border',
                              isActive
                                ? 'bg-sky-500/20 text-sky-200 border-sky-400/20 shadow-sm'
                                : 'bg-white/5 text-slate-300 border-white/10 group-hover:bg-white/10 group-hover:text-white'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="truncate font-medium">{item.label}</span>
                        </div>

                        {item.badge !== null && (
                          <span className="ml-3 bg-red-500/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User section (scrolls with menu) */}
        <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm ring-2 ring-white/10">
              <span className="text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-300/80 capitalize">{user?.role?.replace('_', ' ') || 'user'}</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-3 w-full justify-start border-white/10 bg-white/5 text-slate-100 hover:bg-red-500/15 hover:text-white hover:border-red-400/30 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2 opacity-90" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
