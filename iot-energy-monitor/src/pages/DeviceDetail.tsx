import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { deviceService, historyService, Device } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Zap, Activity, Clock, RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, MapPin, Building2, Layers, Hash, Download } from 'lucide-react';
import { format } from 'date-fns';
import HistoricalChart from '../components/charts/HistoricalChart';
import ParameterSelector from '../components/charts/ParameterSelector';
import TimeRangeSelector, { TimeRange } from '../components/charts/TimeRangeSelector';
import DownloadReportDialog from '../components/charts/DownloadReportDialog';

const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { devices, parameterMapping, refreshDevices, alarms } = useApp();
  const toast = useToast();

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24hrs');
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  // Find device from context or fetch
  useEffect(() => {
    const loadDevice = async () => {
      if (!id) return;
      
      try {
        if (!device) {
          setLoading(true);
        }
        // Try to find in context first
        const deviceId = parseInt(id, 10);
        const foundDevice = devices.find(d => d.id === deviceId);
        
        if (foundDevice) {
          setDevice(foundDevice);
        } else if (!device) {
          // Fetch from API only if device not already loaded
          const fetchedDevice = await deviceService.getDevice(deviceId);
          setDevice(fetchedDevice);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load device';
        toast.error(message);
        navigate('/devices');
      } finally {
        setLoading(false);
      }
    };

    loadDevice();
  }, [id, devices, navigate, toast, device]);

  // Refresh device data
  const handleRefresh = async () => {
    if (!id) return;
    
    setRefreshing(true);
    try {
      await refreshDevices();
      const deviceId = parseInt(id, 10);
      const updatedDevice = devices.find(d => d.id === deviceId);
      if (updatedDevice) {
        setDevice(updatedDevice);
      }
      toast.success('Device data refreshed');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to refresh device data';
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate time range dates
  const getTimeRangeDates = (range: TimeRange): { from: Date; to: Date } => {
    const now = new Date();
    let from: Date;

    switch (range) {
      case '1hr':
        from = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '12hrs':
        from = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        break;
      case '24hrs':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { from, to: now };
  };

  // Load historical data
  useEffect(() => {
    const loadHistory = async () => {
      if (!id) return;
      
      try {
        setLoadingHistory(true);
        const deviceId = parseInt(id, 10);
        const { from, to } = getTimeRangeDates(timeRange);
        
        const data = await historyService.getHistoricalData(
          deviceId.toString(),
          from,
          to
        );
        setHistoricalData(data);
      } catch (err: unknown) {
        // Don't show error for history, just log
        console.error('Failed to load historical data:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    if (device) {
      loadHistory();
    }
  }, [id, device, timeRange]);

  // Auto-refresh historical data for scrolling wave effect
  useEffect(() => {
    if (!device || !id) return;

    // For short time ranges (1hr, 12hrs), refresh more frequently for smooth scrolling
    const refreshInterval = (timeRange === '1hr' || timeRange === '12hrs') ? 10000 : 60000; // 10s for short ranges, 60s for longer

    const interval = setInterval(async () => {
      try {
        const deviceId = parseInt(id, 10);
        const { from, to } = getTimeRangeDates(timeRange);
        
        const data = await historyService.getHistoricalData(
          deviceId.toString(),
          from,
          to
        );
        
        // Always update for smooth scrolling effect (Recharts handles animation)
        setHistoricalData(data);
      } catch {
        // Silent fail for auto-refresh
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [device, id, timeRange]);

  // Handle download report
  const handleDownloadReport = async (from: Date, to: Date) => {
    if (!device || !id) return;

    try {
      const deviceId = id.toString();
      const historicalData = await historyService.getHistoricalData(deviceId, from, to);
      
      // Get all parameter keys from data
      const paramKeysFromData = Array.from(
        new Set(historicalData.flatMap(r => Object.keys(r.parameters || {})))
      );
      const paramKeys = paramKeysFromData.length > 0
        ? paramKeysFromData
        : Object.keys(parameterMapping);

      // Create CSV content
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

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const fromStr = format(from, 'yyyy-MM-dd_HH-mm');
      const toStr = format(to, 'yyyy-MM-dd_HH-mm');
      link.setAttribute('download', `${device.name || 'device'}_${fromStr}_to_${toStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download report');
      throw error;
    }
  };

  // Get available parameters from historical data
  const availableParameters = useMemo(() => {
    const paramSet = new Set<string>();
    historicalData.forEach((point) => {
      Object.keys(point.parameters || {}).forEach((key) => {
        paramSet.add(key);
      });
    });
    return Array.from(paramSet).sort();
  }, [historicalData]);

  // Auto-select parameters when they become available
  useEffect(() => {
    if (availableParameters.length > 0 && selectedParameters.length === 0) {
      // Auto-select first 5 parameters or all if less than 5
      setSelectedParameters(availableParameters.slice(0, 5));
    }
  }, [availableParameters]);

  // Handle parameter selection
  const handleParameterToggle = (parameter: string) => {
    setSelectedParameters((prev) =>
      prev.includes(parameter)
        ? prev.filter((p) => p !== parameter)
        : [...prev, parameter]
    );
  };

  const handleSelectAll = () => {
    setSelectedParameters([...availableParameters]);
  };

  const handleDeselectAll = () => {
    setSelectedParameters([]);
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!device || !id) return;

    const interval = setInterval(async () => {
      try {
        await refreshDevices();
        // Device will be updated via the devices dependency in the first useEffect
      } catch {
        // Silent fail for auto-refresh
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [device, id, refreshDevices]);

  // Get device alarms
  const deviceAlarms = useMemo(() => {
    if (!device) return [];
    return alarms.filter(a => 
      (typeof a.deviceId === 'number' ? a.deviceId.toString() : a.deviceId) === id && 
      !a.acknowledged
    );
  }, [alarms, device, id]);

  // Check if device is online
  const isOnline = useMemo(() => {
    if (!device?.lastUpdate) return false;
    const lastUpdateTime = new Date(device.lastUpdate).getTime();
    const now = new Date().getTime();
    return (now - lastUpdateTime) < 30000; // Online if updated within 30 seconds
  }, [device]);

  // Get parameter icon
  const getParameterIcon = (key: string) => {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('v') || keyLower.includes('voltage')) return Zap;
    if (keyLower.includes('a') || keyLower.includes('current')) return Activity;
    if (keyLower.includes('pf') || keyLower.includes('power')) return TrendingUp;
    return Activity;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading device details...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Device Not Found</h2>
          <p className="text-slate-600 mb-4">The device you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/devices')}>Back to Devices</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/devices')}
              className="border-slate-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{device.name}</h1>
              <p className="text-slate-600 mt-1">
                Real-time monitoring and historical data
              </p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Device Info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
            <Hash className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Hardware Address</p>
              <p className="text-sm font-semibold font-mono">
                {device.hardwareAddress || device.hardware_address}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
            <MapPin className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Location</p>
              <p className="text-sm font-semibold">
                {device.area || 'N/A'} {device.building && `> ${device.building}`} {device.floor && `> ${device.floor}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
            <Clock className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Last Update</p>
              <p className="text-sm font-semibold">
                {device.lastUpdate 
                  ? format(new Date(device.lastUpdate), 'MMM dd, yyyy HH:mm:ss')
                  : 'Never'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
            <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className={`text-sm font-semibold ${isOnline ? 'text-green-600' : 'text-slate-500'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alarms Alert */}
      {deviceAlarms.length > 0 && (
        <Card className="border-2 border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alarms ({deviceAlarms.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deviceAlarms.map((alarm) => (
                <div key={alarm.id} className="bg-white p-3 rounded border border-red-200">
                  <p className="text-sm font-semibold text-red-900">
                    {alarm.parameterLabel} ({alarm.parameterKey})
                  </p>
                  <p className="text-xs text-red-700">
                    Value: {alarm.value} - {alarm.type === 'min' ? 'Below' : 'Above'} threshold: {alarm.threshold}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MQTT Configuration Warning */}
      {!isOnline && (
        <Card className={`border-2 ${!device.mqtt_broker_host || !device.mqtt_topic_pattern ? 'border-yellow-300 bg-yellow-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${!device.mqtt_broker_host || !device.mqtt_topic_pattern ? 'text-yellow-600' : 'text-red-600'}`} />
              <div className="flex-1">
                {!device.mqtt_broker_host || !device.mqtt_topic_pattern ? (
                  <>
                    <p className="text-sm font-semibold text-yellow-800 mb-1">MQTT Configuration Incomplete</p>
                    <p className="text-sm text-yellow-700 mb-2">
                      This device is missing MQTT configuration. To receive real-time data, you need to configure:
                    </p>
                    <ul className="text-sm text-yellow-700 list-disc list-inside mb-2 space-y-1">
                      {!device.mqtt_broker_host && <li>MQTT Broker Host (e.g., "localhost" or "broker.example.com")</li>}
                      {!device.mqtt_topic_pattern && <li>MQTT Topic Pattern (e.g., "EM/ED5432" or "EM/12354")</li>}
                    </ul>
                    <p className="text-sm text-yellow-700">
                      <strong>Solution:</strong> Edit the device and configure the MQTT settings. 
                      {!device.mqtt_topic_pattern && (
                        <> If your MQTT topic doesn't match the hardware address ({device.hardwareAddress || device.hardware_address}), set the MQTT Topic Pattern to match your actual MQTT topic.</>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-red-800 mb-1">Device Offline</p>
                    <p className="text-sm text-red-700 mb-2">
                      This device has MQTT configuration but is not receiving data. Possible causes:
                    </p>
                    <ul className="text-sm text-red-700 list-disc list-inside mb-2 space-y-1">
                      <li>MQTT subscriber is not running (check server logs)</li>
                      <li>Device is not publishing data to topic: <code className="bg-red-100 px-1 rounded">{device.mqtt_topic_pattern}</code></li>
                      <li>MQTT broker is unreachable at {device.mqtt_broker_host}:{device.mqtt_broker_port || 1883}</li>
                      <li>Network connectivity issues</li>
                    </ul>
                    <p className="text-sm text-red-700">
                      <strong>Solution:</strong> Check that the MQTT subscriber is running and the device is publishing data to the configured topic.
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Parameters */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              Real-time Parameters
            </span>
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-xs font-medium text-slate-600">
                {isOnline ? 'Live' : 'Offline'}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {device.parameters && Object.keys(device.parameters).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(device.parameters).map(([key, value]) => {
                const Icon = getParameterIcon(key);
                const label = parameterMapping[key] || key;
                return (
                  <div
                    key={key}
                    className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-semibold text-slate-700">{label}</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{key}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No real-time data available</p>
              <p className="text-sm text-slate-500 mt-2">
                {isOnline 
                  ? 'Waiting for data from device...'
                  : 'Device is offline. Ensure MQTT subscriber is running and device is publishing data.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Data Charts - 50/50 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side (50%) - Controls and Filters */}
        <div className="space-y-4">
          {/* Time Range Selector */}
          <TimeRangeSelector selectedRange={timeRange} onRangeChange={setTimeRange} />
          
          {/* Parameter Selector */}
          {availableParameters.length > 0 ? (
            <ParameterSelector
              availableParameters={availableParameters}
              selectedParameters={selectedParameters}
              parameterMapping={parameterMapping}
              onParameterToggle={handleParameterToggle}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          ) : (
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-blue-600" />
                  Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">No parameters available for this device.</p>
              </CardContent>
            </Card>
          )}
          
          {/* Data Summary */}
          {historicalData.length > 0 && (
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Data Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Data Points</span>
                    <span className="text-lg font-bold text-slate-900">{historicalData.length.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Parameters</span>
                    <span className="text-lg font-bold text-slate-900">{selectedParameters.length}</span>
                  </div>
                  {historicalData.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Last Update</span>
                      <span className="text-sm font-medium text-slate-700">
                        {format(new Date(historicalData[historicalData.length - 1]?.timestamp || ''), 'HH:mm:ss')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side (50%) - Chart */}
        <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
          {selectedParameters.length > 0 ? (
            <>
              <HistoricalChart
                data={historicalData}
                selectedParameters={selectedParameters}
                parameterMapping={parameterMapping}
                timeRange={timeRange}
                isLoading={loadingHistory}
                scrollMode={timeRange === '1hr' || timeRange === '12hrs'} // Enable scroll mode for short time ranges
                maxDataPoints={100} // Show last 100 points in scroll mode
              />
              {/* Download Report Button - In white space below chart */}
              <Card className="border border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <Button
                    onClick={() => setShowDownloadDialog(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Device Report
                  </Button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Export historical data with custom date/time filters
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                  Real-time Wave Chart
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600 font-medium">No parameters selected</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Select parameters from the left panel to view the chart.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Download Report Dialog */}
      {device && id && (
        <DownloadReportDialog
          open={showDownloadDialog}
          onOpenChange={setShowDownloadDialog}
          deviceId={id}
          deviceName={device.name}
          parameterMapping={parameterMapping}
          onDownload={handleDownloadReport}
        />
      )}
    </div>
  );
};

export default DeviceDetail;
