import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { deviceService, Device } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Plus, Zap, MapPin, Building2, Layers, Hash, Pencil, Trash2 } from 'lucide-react';

const DeviceRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { devices, refreshDevices, user } = useApp();
  const canEditDeleteDevices = user?.role === 'super_admin';
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editName, setEditName] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editBuilding, setEditBuilding] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editMqttTopicPattern, setEditMqttTopicPattern] = useState('');
  const [editMqttBrokerHost, setEditMqttBrokerHost] = useState('');
  const [editMqttBrokerPort, setEditMqttBrokerPort] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openEdit = (device: Device) => {
    setEditingDevice(device);
    setEditName(device.name);
    setEditArea(device.area ?? '');
    setEditBuilding(device.building ?? '');
    setEditFloor(device.floor ?? '');
    setEditMqttTopicPattern(device.mqtt_topic_pattern ?? '');
    setEditMqttBrokerHost(device.mqtt_broker_host ?? '');
    setEditMqttBrokerPort(device.mqtt_broker_port?.toString() ?? '1883');
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      toast.error('Device name is required.');
      return;
    }
    setEditLoading(true);
    try {
      const updateData: any = {
        name: trimmedName,
      };
      
      // Include all fields (empty strings will be converted to null by backend)
      updateData.area = editArea.trim() || null;
      updateData.building = editBuilding.trim() || null;
      updateData.floor = editFloor.trim() || null;
      updateData.mqtt_topic_pattern = editMqttTopicPattern.trim() || null;
      updateData.mqtt_broker_host = editMqttBrokerHost.trim() || null;
      
      if (editMqttBrokerPort.trim()) {
        const port = parseInt(editMqttBrokerPort.trim(), 10);
        if (!isNaN(port) && port > 0) {
          updateData.mqtt_broker_port = port;
        } else {
          updateData.mqtt_broker_port = null;
        }
      } else {
        updateData.mqtt_broker_port = null;
      }
      
      await deviceService.updateDevice(editingDevice.id, updateData);
      await refreshDevices();
      setEditOpen(false);
      setEditingDevice(null);
      toast.success('Device updated successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update device.';
      toast.error(message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deviceToDelete) return;
    setDeleteLoading(true);
    try {
      await deviceService.deleteDevice(deviceToDelete.id);
      await refreshDevices();
      setDeleteConfirmOpen(false);
      setDeviceToDelete(null);
      toast.success('Device removed successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove device.';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Device Registration</h1>
            <p className="text-slate-600">
              Register new IoT devices using their 5-digit hardware address
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => navigate('/devices/register')}
              variant="outline"
              className="border-slate-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              Register Manually
            </Button>
            <Button 
              onClick={() => navigate('/devices/register-mqtt')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Register via MQTT
            </Button>
          </div>
        </div>
      </div>

      {/* Device Grid */}
      {devices.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Zap className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium mb-2">No devices registered</p>
            <p className="text-slate-500 text-sm mb-4">Register your first device with a 5-digit hardware address and name. You can add Area, Building, and Floor for grouping.</p>
            <Button variant="outline" onClick={() => navigate('/help')} className="border-slate-300">
              How to use this app
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Registered Devices ({devices.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <Card 
                key={device.id} 
                onClick={() => navigate(`/devices/${device.id}`)}
                className="hover:shadow-lg transition-shadow border border-slate-200 cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Zap className="h-5 w-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-900">{device.name}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mb-2">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {device.hardwareAddress || device.hardware_address}
                        </span>
                      </div>
                    </div>
                    {canEditDeleteDevices && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEdit(device); }}
                          className="border-slate-300 text-slate-700 hover:bg-slate-100"
                          title="Edit device"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setDeviceToDelete(device); setDeleteConfirmOpen(true); }}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          title="Remove device"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {device.area && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span><strong>Area:</strong> {device.area}</span>
                      </div>
                      {device.building && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span><strong>Building:</strong> {device.building}</span>
                        </div>
                      )}
                      {device.floor && (
                        <div className="flex items-center space-x-2 text-slate-600">
                          <Layers className="h-4 w-4 text-slate-400" />
                          <span><strong>Floor:</strong> {device.floor}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Device Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditingDevice(null); setEditOpen(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader onClose={() => setEditOpen(false)}>
            <DialogTitle className="text-2xl font-bold">Update Device</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            {editingDevice && (
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <Hash className="h-4 w-4" />
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
                  Hardware address: {editingDevice.hardwareAddress || editingDevice.hardware_address}
                </span>
                <span className="text-slate-400">(read-only)</span>
              </div>
            )}
            <div>
              <label htmlFor="editName" className="block text-sm font-semibold text-slate-700 mb-2">
                <Zap className="h-4 w-4 inline mr-1" />
                User-Friendly Name *
              </label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Main Meter"
                className="h-11"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="editArea" className="block text-sm font-semibold text-slate-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Area
                </label>
                <Input
                  id="editArea"
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  placeholder="Area (optional)"
                  className="h-11"
                />
              </div>
              <div>
                <label htmlFor="editBuilding" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Building2 className="h-4 w-4 inline mr-1" />
                  Building
                </label>
                <Input
                  id="editBuilding"
                  value={editBuilding}
                  onChange={(e) => setEditBuilding(e.target.value)}
                  placeholder="Building (optional)"
                  className="h-11"
                />
              </div>
              <div>
                <label htmlFor="editFloor" className="block text-sm font-semibold text-slate-700 mb-2">
                  <Layers className="h-4 w-4 inline mr-1" />
                  Floor
                </label>
                <Input
                  id="editFloor"
                  value={editFloor}
                  onChange={(e) => setEditFloor(e.target.value)}
                  placeholder="Floor (optional)"
                  className="h-11"
                />
              </div>
            </div>
            
            {/* MQTT Configuration Section */}
            <div className="border-t border-slate-200 pt-5 mt-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                MQTT Configuration (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editMqttBrokerHost" className="block text-sm font-semibold text-slate-700 mb-2">
                    MQTT Broker Host
                  </label>
                  <Input
                    id="editMqttBrokerHost"
                    value={editMqttBrokerHost}
                    onChange={(e) => setEditMqttBrokerHost(e.target.value)}
                    placeholder="e.g. localhost or broker.example.com"
                    className="h-11"
                  />
                </div>
                <div>
                  <label htmlFor="editMqttBrokerPort" className="block text-sm font-semibold text-slate-700 mb-2">
                    MQTT Broker Port
                  </label>
                  <Input
                    id="editMqttBrokerPort"
                    type="number"
                    value={editMqttBrokerPort}
                    onChange={(e) => setEditMqttBrokerPort(e.target.value)}
                    placeholder="1883"
                    className="h-11"
                    min="1"
                    max="65535"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label htmlFor="editMqttTopicPattern" className="block text-sm font-semibold text-slate-700 mb-2">
                  MQTT Topic Pattern
                </label>
                <Input
                  id="editMqttTopicPattern"
                  value={editMqttTopicPattern}
                  onChange={(e) => setEditMqttTopicPattern(e.target.value)}
                  placeholder="e.g. EM/ED5432 or EM/12354"
                  className="h-11"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Set this to match your MQTT topic. If not set, system will try to match by hardware address.
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Note:</strong> Configure MQTT settings to enable real-time data collection. Both broker host and topic pattern are required for MQTT data ingestion.
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Device Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { if (!open) setDeviceToDelete(null); setDeleteConfirmOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader onClose={() => { setDeleteConfirmOpen(false); setDeviceToDelete(null); }}>
            <DialogTitle className="text-xl font-bold text-red-600">Remove Device</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-slate-700">
              Are you sure you want to remove <strong>{deviceToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-slate-500">
              This action cannot be undone. The device and its data will be removed from the system.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setDeviceToDelete(null); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteLoading ? 'Removing...' : 'Remove Device'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceRegistration;
