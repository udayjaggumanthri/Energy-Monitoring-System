import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { historyService } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Download, FileSpreadsheet, Calendar, Zap, TrendingDown } from 'lucide-react';
import { format, subDays } from 'date-fns';

const Reports: React.FC = () => {
  const { devices, parameterMapping, user } = useApp();
  const [selectedDevice, setSelectedDevice] = useState('');
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const visibleDevices = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'super_admin' || user.role === 'admin') {
      return devices;
    }
    // Users see only assigned devices; backend already filters device list for role 'user'
    const assigned = user.assignedDevices ?? [];
    if (assigned.length === 0) {
      return devices; // Defensive: backend already filtered, avoid empty list from missing field
    }
    return devices.filter(d => {
      const deviceIdStr = typeof d.id === 'number' ? d.id.toString() : d.id;
      return assigned.includes(deviceIdStr);
    });
  }, [devices, user]);

  const handleDownload = async () => {
    if (!selectedDevice) {
      alert('Please select a device');
      return;
    }

    setLoading(true);
    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      const historicalData = await historyService.getHistoricalData(selectedDevice, from, to);
      const device = devices.find(d => {
        const deviceIdStr = typeof d.id === 'number' ? d.id.toString() : d.id;
        return deviceIdStr === selectedDevice;
      });

      // Derive parameter columns from data when mapping is empty, else use mapping keys; union with record keys for completeness
      const paramKeysFromMapping = Object.keys(parameterMapping);
      const paramKeysFromData = Array.from(
        new Set(historicalData.flatMap(r => Object.keys(r.parameters || {})))
      );
      const paramKeys = paramKeysFromMapping.length > 0
        ? Array.from(new Set([...paramKeysFromMapping, ...paramKeysFromData]))
        : paramKeysFromData;

      const headers = ['Timestamp', ...paramKeys.map(key => parameterMapping[key] || key)];
      const rows = historicalData.map(record => {
        const row = [record.timestamp];
        paramKeys.forEach(key => {
          const value = record.parameters[key] ?? '';
          row.push(typeof value === 'number' ? value.toFixed(2) : String(value));
        });
        return row;
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${device?.name || 'device'}_${fromDate}_to_${toDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const selectedDeviceData = devices.find(d => {
    const deviceIdStr = typeof d.id === 'number' ? d.id.toString() : d.id;
    return deviceIdStr === selectedDevice;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Download Reports</h1>
            <p className="text-slate-600">
              Export historical energy data as CSV (up to 15 days)
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Historical data is retained for the last 15 days.
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Report Generator Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-blue-600" />
            <span>Generate Report</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <label htmlFor="device" className="block text-sm font-semibold text-slate-700 mb-2">
              <Zap className="h-4 w-4 inline mr-1" />
              Select Device *
            </label>
            <select
              id="device"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select a device</option>
              {visibleDevices.map((d) => {
                const deviceIdStr = typeof d.id === 'number' ? d.id.toString() : d.id;
                return (
                  <option key={d.id} value={deviceIdStr}>
                    {d.name} ({d.hardwareAddress || d.hardware_address})
                  </option>
                );
              })}
            </select>
            {selectedDeviceData && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Selected:</strong> {selectedDeviceData.name}
                  {selectedDeviceData.area && ` - ${selectedDeviceData.area}`}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fromDate" className="block text-sm font-semibold text-slate-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                From Date *
              </label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="h-11"
                required
              />
            </div>
            <div>
              <label htmlFor="toDate" className="block text-sm font-semibold text-slate-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                To Date *
              </label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                min={fromDate}
                className="h-11"
                required
              />
            </div>
          </div>

          {selectedDevice && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingDown className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">Report Preview</span>
              </div>
              <p className="text-sm text-slate-600">
                Report will include data from <strong>{format(new Date(fromDate), 'PP')}</strong> to{' '}
                <strong>{format(new Date(toDate), 'PP')}</strong>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Parameters: {Object.keys(parameterMapping).length > 0
                  ? Object.keys(parameterMapping).map(key => parameterMapping[key]).join(', ')
                  : 'From data (labels may be parameter keys)'}
              </p>
            </div>
          )}

          <div className="flex items-center space-x-3 pt-4 border-t">
            <Button 
              onClick={handleDownload} 
              disabled={loading || !selectedDevice}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Generating Report...' : 'Download CSV Report'}
            </Button>
            {loading && (
              <span className="text-sm text-slate-600">Processing historical data...</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
