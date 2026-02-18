import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { thresholdService } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Plus, Trash2, AlertTriangle, Zap, Minus, Maximize } from 'lucide-react';

const ThresholdSettings: React.FC = () => {
  const { devices, parameterMapping, thresholds, setThresholds } = useApp();
  const [open, setOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedParameter, setSelectedParameter] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !selectedParameter) return;

    const threshold = {
      deviceId: selectedDevice,
      parameterKey: selectedParameter,
      min: min ? parseFloat(min) : undefined,
      max: max ? parseFloat(max) : undefined,
    };

    await thresholdService.setThreshold(threshold);
    const allThresholds = await thresholdService.getThresholds();
    setThresholds(allThresholds);
    setOpen(false);
    setSelectedDevice('');
    setSelectedParameter('');
    setMin('');
    setMax('');
  };

  const handleDelete = async (id: number) => {
    await thresholdService.deleteThreshold(id);
    const allThresholds = await thresholdService.getThresholds();
    setThresholds(allThresholds);
  };

  const deviceThresholds = thresholds.reduce((acc, t) => {
    if (!acc[t.deviceId]) acc[t.deviceId] = [];
    acc[t.deviceId].push(t);
    return acc;
  }, {} as Record<string, typeof thresholds>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Threshold Settings</h1>
            <p className="text-slate-600">
              Configure min/max limits for device parameters (up to 20 per device)
            </p>
          </div>
          <Button 
            onClick={() => setOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Threshold
          </Button>
        </div>
      </div>

      {/* Thresholds List */}
      {Object.keys(deviceThresholds).length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium mb-2">No thresholds configured</p>
            <p className="text-slate-500 text-sm">Add thresholds to monitor parameter limits and trigger alarms</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => {
            const deviceId = typeof device.id === 'number' ? device.id.toString() : device.id;
            const deviceThresh = deviceThresholds[deviceId] || [];
            if (deviceThresh.length === 0) return null;

            return (
              <Card key={device.id} className="border border-slate-200 hover:shadow-md transition-shadow">
                {/* Device card - device.id is now number */}
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        Hardware ID: {device.hardwareAddress || device.hardware_address}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deviceThresh.map((threshold) => {
                      const label = parameterMapping[threshold.parameterKey] || threshold.parameterKey;
                      return (
                        <div
                          key={threshold.id ?? `${threshold.deviceId}-${threshold.parameterKey}`}
                          className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white hover:border-blue-300 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 mb-2">{label}</div>
                            <div className="flex items-center space-x-4 text-sm">
                              {threshold.min !== undefined && (
                                <div className="flex items-center space-x-1 text-blue-600">
                                  <Minus className="h-4 w-4" />
                                  <span><strong>Min:</strong> {threshold.min}</span>
                                </div>
                              )}
                              {threshold.max !== undefined && (
                                <div className="flex items-center space-x-1 text-red-600">
                                  <Maximize className="h-4 w-4" />
                                  <span><strong>Max:</strong> {threshold.max}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {threshold.id != null && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(threshold.id!)}
                              className="ml-3"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Threshold Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader onClose={() => setOpen(false)}>
            <DialogTitle className="text-2xl font-bold">Add Threshold</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="device" className="block text-sm font-semibold text-slate-700 mb-2">
                <Zap className="h-4 w-4 inline mr-1" />
                Device *
              </label>
              <select
                id="device"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select a device</option>
                {devices.map((d) => (
                  <option key={d.id} value={typeof d.id === 'number' ? d.id.toString() : d.id}>
                    {d.name} ({d.hardwareAddress || d.hardware_address})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="parameter" className="block text-sm font-semibold text-slate-700 mb-2">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Parameter *
              </label>
              <select
                id="parameter"
                value={selectedParameter}
                onChange={(e) => setSelectedParameter(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select a parameter</option>
                {Object.keys(parameterMapping).map((key) => (
                  <option key={key} value={key}>
                    {parameterMapping[key]} ({key})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="min" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Minus className="h-4 w-4 inline mr-1" />
                  Minimum Value
                </label>
                <Input
                  id="min"
                  type="number"
                  step="0.01"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
              <div>
                <label htmlFor="max" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Maximize className="h-4 w-4 inline mr-1" />
                  Maximum Value
                </label>
                <Input
                  id="max"
                  type="number"
                  step="0.01"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  placeholder="100.00"
                  className="h-11"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Add Threshold
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThresholdSettings;
