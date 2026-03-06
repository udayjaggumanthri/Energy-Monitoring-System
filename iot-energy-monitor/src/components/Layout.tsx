import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { brandingService } from '../lib/api';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const location = useLocation();
  const { user } = useApp();
  const [brandingTitle, setBrandingTitle] = React.useState('IoT Monitoring System');

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    brandingService.getBranding()
      .then((b) => {
        const nextTitle = b.title || 'IoT Monitoring System';
        setBrandingTitle(nextTitle);
        document.title = nextTitle;
      })
      .catch(() => {});
  }, [user?.id]);

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow || '';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Sidebar variant="desktop" />

      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <Sidebar variant="mobile" isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="lg:ml-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 lg:hidden bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="h-14 px-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 text-center">
              <p className="text-sm font-semibold text-slate-900 truncate">{brandingTitle}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.name ? `Welcome, ${user.name}` : 'Energy Monitor'}</p>
            </div>

            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
