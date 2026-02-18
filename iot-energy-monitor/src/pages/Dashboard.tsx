import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { format } from 'date-fns';
import { AlertTriangle, Zap, Activity, Gauge, Waves, TrendingUp, MapPin, Clock, CheckCircle2, Search, ChevronRight } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { devices, parameterMapping, user, alarms } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter devices based on user role
  const visibleDevices = useMemo(() => {
    if (!user) return [];
    if (user.role === 'super_admin' || user.role === 'admin') {
      return devices;
    }
    // Users see only assigned devices (handled by backend API)
    return devices;
  }, [devices, user]);

  // Filter devices by search query
  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return visibleDevices;
    const query = searchQuery.toLowerCase();
    return visibleDevices.filter(device => {
      const name = device.name?.toLowerCase() || '';
      const hardwareId = (device.hardwareAddress || device.hardware_address || '').toLowerCase();
      const area = device.area?.toLowerCase() || '';
      const building = device.building?.toLowerCase() || '';
      const floor = device.floor?.toLowerCase() || '';
      return name.includes(query) || 
             hardwareId.includes(query) || 
             area.includes(query) || 
             building.includes(query) || 
             floor.includes(query);
    });
  }, [visibleDevices, searchQuery]);

  const getDeviceAlarms = (deviceId: number | string) => {
    const deviceIdStr = typeof deviceId === 'number' ? deviceId.toString() : deviceId;
    return alarms.filter(a => a.deviceId === deviceIdStr && !a.acknowledged);
  };

  // Get icon for parameter
  const getParameterIcon = (key: string) => {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('v') || keyLower.includes('voltage')) return Zap;
    if (keyLower.includes('a') || keyLower.includes('current')) return Activity;
    if (keyLower.includes('pf') || keyLower.includes('power')) return Gauge;
    if (keyLower.includes('hz') || keyLower.includes('freq')) return Waves;
    if (keyLower.includes('kw') || keyLower.includes('power')) return TrendingUp;
    return Activity;
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalDevices = visibleDevices.length;
    const onlineDevices = visibleDevices.filter(d => {
      if (!d.lastUpdate) return false;
      return new Date().getTime() - new Date(d.lastUpdate).getTime() < 10000;
    }).length;
    const totalAlarms = alarms.filter(a => !a.acknowledged).length;
    const totalPower = visibleDevices.reduce((sum, d) => {
      if (!d.parameters) return sum;
      const power = d.parameters['tkW'] || d.parameters['tkw'] || d.parameters['total_kw'] || 0;
      return sum + power;
    }, 0);

    return { totalDevices, onlineDevices, totalAlarms, totalPower };
  }, [visibleDevices, alarms]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Energy Monitoring Dashboard</h1>
            <p className="text-slate-600">
              Real-time monitoring and analytics for {visibleDevices.length} device{visibleDevices.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium text-slate-600">Live</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Devices</p>
                <p className="text-3xl font-bold">{stats.totalDevices}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Zap className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Online Devices</p>
                <p className="text-3xl font-bold">{stats.onlineDevices}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium mb-1">Active Alarms</p>
                <p className="text-3xl font-bold">{stats.totalAlarms}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Total Power</p>
                <p className="text-3xl font-bold">{stats.totalPower.toFixed(2)} kW</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Table/Grid View */}
      {visibleDevices.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Zap className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium mb-2">No devices available</p>
            <p className="text-slate-500 text-sm mb-4">
              {user?.role === 'super_admin' || user?.role === 'admin'
                ? 'Register devices in the Devices page, or assign devices to users in User Management.'
                : 'No devices are assigned to your account. Ask an admin to assign devices to you.'}
            </p>
            <Button variant="outline" onClick={() => navigate('/help')} className="border-slate-300">
              How to use this app
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-xl font-semibold text-slate-900">
                Device Overview ({filteredDevices.length} {filteredDevices.length === 1 ? 'device' : 'devices'})
              </CardTitle>
              <div className="flex items-center space-x-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search devices by name, ID, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-2 border border-slate-200 rounded-md p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                      viewMode === 'table'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'table' ? (
              /* Table View */
              <div className="overflow-x-auto">
                <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Device Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Hardware ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Power (kW)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Voltage (V)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Current (A)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Alarms
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Last Update
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredDevices.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                            No devices found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredDevices.map((device) => {
                          const deviceAlarms = getDeviceAlarms(device.id);
                          const hasAlarms = deviceAlarms.length > 0;
                          const isOnline = device.lastUpdate && 
                            new Date().getTime() - new Date(device.lastUpdate).getTime() < 10000;
                          
                          // Extract key parameters
                          const power = device.parameters?.['tkW'] || device.parameters?.['tkw'] || device.parameters?.['total_kw'] || device.parameters?.['KW'] || 0;
                          const voltage = device.parameters?.['AV'] || device.parameters?.['av'] || device.parameters?.['voltage'] || device.parameters?.['V'] || 0;
                          const current = device.parameters?.['AA'] || device.parameters?.['aa'] || device.parameters?.['current'] || device.parameters?.['A'] || 0;

                          return (
                            <tr
                              key={device.id}
                              onClick={() => navigate(`/devices/${device.id}`)}
                              className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                                hasAlarms ? 'bg-red-50/50' : ''
                              }`}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div
                                    className={`h-3 w-3 rounded-full mr-2 ${
                                      isOnline
                                        ? 'bg-green-500 animate-pulse'
                                        : 'bg-slate-400'
                                    }`}
                                  />
                                  <span className={`text-xs font-medium ${
                                    isOnline ? 'text-green-600' : 'text-slate-500'
                                  }`}>
                                    {isOnline ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="font-semibold text-slate-900">{device.name}</div>
                                  {hasAlarms && (
                                    <AlertTriangle className="h-4 w-4 text-red-500 ml-2" />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-mono text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                  {device.hardwareAddress || device.hardware_address}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center text-sm text-slate-600">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  <span>
                                    {device.area || 'N/A'}
                                    {device.building && ` > ${device.building}`}
                                    {device.floor && ` > ${device.floor}`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm font-semibold text-slate-900">
                                  {typeof power === 'number' ? power.toFixed(2) : power} kW
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-slate-700">
                                  {typeof voltage === 'number' ? voltage.toFixed(2) : voltage} V
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-slate-700">
                                  {typeof current === 'number' ? current.toFixed(2) : current} A
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {hasAlarms ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {deviceAlarms.length} Active
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">None</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center text-sm text-slate-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span className="font-mono">
                                    {device.lastUpdate
                                      ? format(new Date(device.lastUpdate), 'HH:mm:ss')
                                      : 'Never'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Grid View (Original) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDevices.map((device) => {
                  const deviceAlarms = getDeviceAlarms(device.id);
                  const hasAlarms = deviceAlarms.length > 0;
                  const isOnline = device.lastUpdate && 
                    new Date().getTime() - new Date(device.lastUpdate).getTime() < 10000;

                  return (
                    <Card
                      key={device.id}
                      onClick={() => navigate(`/devices/${device.id}`)}
                      className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer ${
                        hasAlarms 
                          ? 'border-2 border-red-500 shadow-lg shadow-red-500/20' 
                          : 'border border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {/* Status Indicator Bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        isOnline ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-slate-300'
                      }`} />

                      {/* Alarm Badge */}
                      {hasAlarms && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1.5 shadow-lg">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      )}

                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-bold text-slate-900 mb-1">
                              {device.name}
                            </CardTitle>
                            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2">
                              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                                ID: {device.hardwareAddress || device.hardware_address}
                              </span>
                            </div>
                            {device.area && (
                              <div className="flex items-center text-xs text-slate-600">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span>{device.area} {device.building && `> ${device.building}`} {device.floor && `> ${device.floor}`}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Parameters (up to 20 per device, Module 3) */}
                        {device.parameters && Object.entries(device.parameters).slice(0, 20).map(([key, value]) => {
                          const label = parameterMapping[key] || key;
                          const alarm = deviceAlarms.find(a => a.parameterKey === key);
                          const isAlarming = alarm !== undefined;
                          const Icon = getParameterIcon(key);

                          return (
                            <div
                              key={key}
                              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                isAlarming 
                                  ? 'bg-red-50 border border-red-200' 
                                  : 'bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <div className={`p-1.5 rounded-lg ${
                                  isAlarming ? 'bg-red-100' : 'bg-blue-100'
                                }`}>
                                  <Icon className={`h-4 w-4 ${
                                    isAlarming ? 'text-red-600' : 'text-blue-600'
                                  }`} />
                                </div>
                                <span className="text-sm font-medium text-slate-700">{label}</span>
                              </div>
                              <span className={`text-sm font-bold ${
                                isAlarming ? 'text-red-600' : 'text-slate-900'
                              }`}>
                                {typeof value === 'number' ? value.toFixed(2) : value}
                                {key.toLowerCase().includes('kw') && ' kW'}
                                {key.toLowerCase().includes('v') && ' V'}
                                {key.toLowerCase().includes('a') && ' A'}
                                {key.toLowerCase().includes('hz') && ' Hz'}
                              </span>
                            </div>
                          );
                        })}
                        
                        {/* Entity Bar */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-slate-400" />
                              <span className="text-xs text-slate-500">Last Update</span>
                            </div>
                            <span className="text-xs font-mono text-slate-700">
                              {device.lastUpdate
                                ? format(new Date(device.lastUpdate), 'HH:mm:ss')
                                : 'Never'}
                            </span>
                          </div>
                          <div className="flex items-center mt-2">
                            <div
                              className={`h-2.5 w-2.5 rounded-full mr-2 ${
                                isOnline
                                  ? 'bg-green-500 animate-pulse'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span className={`text-xs font-medium ${
                              isOnline ? 'text-green-600' : 'text-slate-500'
                            }`}>
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
