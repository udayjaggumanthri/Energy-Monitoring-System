import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { authService } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { brandingService } from '../lib/api';
import { Zap, Lock, Mail, Shield } from 'lucide-react';

const Login: React.FC = () => {
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email_or_mobile?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { setUser } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [branding, setBranding] = React.useState({ logo: '', title: 'IoT Energy Monitoring System' });

  React.useEffect(() => {
    brandingService.getBranding().then(setBranding).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const trimmedEmail = emailOrMobile.trim();
    const trimmedPassword = password;

    if (!trimmedEmail) {
      setFieldErrors((prev) => ({ ...prev, email_or_mobile: 'Enter your email or mobile number.' }));
      return;
    }
    if (!trimmedPassword) {
      setFieldErrors((prev) => ({ ...prev, password: 'Enter your password.' }));
      return;
    }
    setLoading(true);

    try {
      const user = await authService.login(trimmedEmail, trimmedPassword);
      if (user) {
        setUser(user);
        toast.success('Signed in successfully. Welcome back!');
        navigate('/dashboard');
      } else {
        setError('Invalid credentials. Please check your email/mobile and password.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      const details = (err as Error & { details?: Record<string, string[]> })?.details;
      if (details && typeof details === 'object') {
        const emailMsg = Array.isArray(details.email_or_mobile) ? details.email_or_mobile[0] : details.email_or_mobile;
        const passMsg = Array.isArray(details.password) ? details.password[0] : details.password;
        setFieldErrors({
          ...(emailMsg && { email_or_mobile: emailMsg }),
          ...(passMsg && { password: passMsg }),
        });
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-8 pt-8">
            <div className="flex flex-col items-center space-y-4">
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="h-20 w-auto mb-2" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg mb-2">
                  <Zap className="h-12 w-12 text-white" />
                </div>
              )}
              <CardTitle className="text-2xl font-bold text-slate-900">{branding.title}</CardTitle>
              <p className="text-sm text-slate-600 flex items-center space-x-1">
                <Shield className="h-4 w-4" />
                <span>Enterprise Energy Monitoring Platform</span>
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="emailOrMobile" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email or Mobile Number
                </label>
                <Input
                  id="emailOrMobile"
                  type="text"
                  value={emailOrMobile}
                  onChange={(e) => { setEmailOrMobile(e.target.value); setFieldErrors((p) => ({ ...p, email_or_mobile: undefined })); }}
                  placeholder="e.g. admin@company.com or 9876543210"
                  className={`h-12 text-base ${fieldErrors.email_or_mobile ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.email_or_mobile && (
                  <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.email_or_mobile}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Lock className="h-4 w-4 inline mr-1" />
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                  placeholder="Enter your password"
                  className={`h-12 text-base ${fieldErrors.password ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.password}</p>
                )}
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
