import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { deviceService } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Zap, MapPin, Building2, Layers, Hash, Plus } from 'lucide-react';

const RegisterDevice: React.FC = () => {
  const navigate = useNavigate();
  const { refreshDevices } = useApp();
  const toast = useToast();
  const [hardwareAddress, setHardwareAddress] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError('');
    const trimmedHw = hardwareAddress.trim();
    const trimmedName = name.trim();
    if (!/^\d{5}$/.test(trimmedHw)) {
      setFieldError('Hardware address must be exactly 5 digits (e.g. 46542).');
      return;
    }
    if (!trimmedName) {
      setFieldError('Device name is required.');
      return;
    }

    setLoading(true);
    try {
      await deviceService.registerDevice(
        trimmedHw,
        trimmedName,
        area.trim() || undefined,
        building.trim() || undefined,
        floor.trim() || undefined
      );
      await refreshDevices();
      toast.success('Device registered successfully. It will appear on the Dashboard.');
      navigate('/devices');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register device. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            onClick={() => navigate('/devices')}
            className="border-slate-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <nav className="text-sm text-slate-500 mb-1" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => navigate('/devices')}
                className="hover:text-blue-600 focus:outline-none"
              >
                Devices
              </button>
              <span className="mx-2">/</span>
              <span className="text-slate-700 font-medium">Register New Device</span>
            </nav>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Register New Device</h1>
            <p className="text-slate-600">
              Add a new IoT device using its 5-digit hardware address. You can optionally set Area, Building, and Floor for grouping.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <span>Device Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="hardwareAddress" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Hash className="h-4 w-4 inline mr-1" />
                  Hardware Address (5 digits) *
                </label>
                <Input
                  id="hardwareAddress"
                  value={hardwareAddress}
                  onChange={(e) => { setHardwareAddress(e.target.value); setFieldError(''); }}
                  placeholder="e.g. 46542 (exactly 5 digits)"
                  maxLength={5}
                  pattern="\d{5}"
                  className={`h-11 ${fieldError ? 'border-red-500' : ''}`}
                  required
                />
                {fieldError && <p className="mt-1 text-sm text-red-600" role="alert">{fieldError}</p>}
                <p className="text-xs text-slate-500 mt-1">Exactly 5 digits from your device</p>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Zap className="h-4 w-4 inline mr-1" />
                  User-Friendly Name *
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFieldError(''); }}
                  placeholder="e.g. Main Meter"
                  className="h-11"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Display name on Dashboard</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="area" className="block text-sm font-semibold text-slate-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Area
                </label>
                <Input
                  id="area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Area (optional)"
                  className="h-11"
                />
              </div>
              <div>
                <label htmlFor="building" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Building
                </label>
                <Input
                  id="building"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="Building (optional)"
                  className="h-11"
                />
              </div>
              <div>
                <label htmlFor="floor" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Layers className="h-4 w-4 inline mr-1" />
                  Floor
                </label>
                <Input
                  id="floor"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="Floor (optional)"
                  className="h-11"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/devices')}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              >
                {loading ? 'Registering...' : 'Register Device'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterDevice;
