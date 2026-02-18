import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Users, Mail, Phone, Shield, ArrowLeft, UserPlus, Lock, User } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

type FieldErrors = Record<string, string | undefined>;

const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useApp();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');

  const allowedRoles: ('admin' | 'user')[] = currentUser?.role === 'super_admin' 
    ? ['admin', 'user'] 
    : ['user'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    if (!username.trim()) {
      setFieldErrors((p) => ({ ...p, username: 'Username is required (at least 3 characters).' }));
      setLoading(false);
      return;
    }
    if (username.trim().length < 3) {
      setFieldErrors((p) => ({ ...p, username: 'Username must be at least 3 characters.' }));
      setLoading(false);
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      setFieldErrors((p) => ({ ...p, email: 'Either email or mobile number is required so the user can sign in.' }));
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setFieldErrors((p) => ({ ...p, password: 'Password must be at least 8 characters long.' }));
      setLoading(false);
      return;
    }
    if (password !== passwordConfirm) {
      setFieldErrors((p) => ({ ...p, password_confirm: 'Password and confirmation do not match.' }));
      setLoading(false);
      return;
    }

    try {
      await userService.createUser({
        username: username.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        password,
        password_confirm: passwordConfirm,
        role,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });

      toast.success('User created successfully. They can now sign in.');
      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setMobile('');
      setPassword('');
      setPasswordConfirm('');
      setRole('user');
      setTimeout(() => navigate('/users'), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user. Please try again.';
      setError(message);
      const details = (err as Error & { details?: Record<string, string[]> })?.details;
      if (details && typeof details === 'object') {
        const next: FieldErrors = {};
        Object.entries(details).forEach(([k, v]) => {
          const msg = Array.isArray(v) ? v[0] : v;
          if (typeof msg === 'string') next[k] = msg;
        });
        setFieldErrors(next);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            onClick={() => navigate('/users')}
            className="border-slate-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New User</h1>
            <p className="text-slate-600">
              Add a new user to the system and assign appropriate permissions
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <Shield className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Card */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <span>User Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username and Role Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                  <User className="h-4 w-4 inline mr-1" />
                  Username *
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldErrors((p) => ({ ...p, username: undefined })); }}
                  placeholder="e.g. jane_doe (letters, numbers, underscore)"
                  className={`h-11 ${fieldErrors.username ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.username && <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.username}</p>}
                <p className="text-xs text-slate-500 mt-1">At least 3 characters. Used for sign-in.</p>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Role *
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {currentUser?.role === 'super_admin' 
                    ? 'Super Admin can create Admin or User accounts'
                    : 'Admin can only create User accounts'}
                </p>
              </div>
            </div>

            {/* Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Users className="h-4 w-4 inline mr-1" />
                  First Name
                </label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="h-11"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Users className="h-4 w-4 inline mr-1" />
                  Last Name
                </label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="h-11"
                />
              </div>
            </div>

            {/* Contact Information Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="e.g. user@company.com"
                  className={`h-11 ${fieldErrors.email ? 'border-red-500' : ''}`}
                />
                {fieldErrors.email && <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.email}</p>}
                <p className="text-xs text-slate-500 mt-1">Required if mobile is not provided</p>
              </div>

              <div>
                <label htmlFor="mobile" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Mobile Number
                </label>
                <Input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value); setFieldErrors((p) => ({ ...p, mobile: undefined })); }}
                  placeholder="e.g. 9876543210"
                  className={`h-11 ${fieldErrors.mobile ? 'border-red-500' : ''}`}
                />
                {fieldErrors.mobile && <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.mobile}</p>}
                <p className="text-xs text-slate-500 mt-1">Required if email is not provided</p>
              </div>
            </div>

            {/* Password Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center space-x-2">
                <Lock className="h-5 w-5 text-blue-600" />
                <span>Password</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password *
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                    placeholder="Minimum 8 characters"
                    className={`h-11 ${fieldErrors.password ? 'border-red-500' : ''}`}
                    required
                  />
                  {fieldErrors.password && <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.password}</p>}
                  <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
                </div>

                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm font-semibold text-slate-700 mb-2">
                    Confirm Password *
                  </label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => { setPasswordConfirm(e.target.value); setFieldErrors((p) => ({ ...p, password_confirm: undefined })); }}
                    placeholder="Re-enter password"
                    className={`h-11 ${fieldErrors.password_confirm ? 'border-red-500' : ''}`}
                    required
                  />
                  {fieldErrors.password_confirm && <p className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.password_confirm}</p>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/users')}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUser;
