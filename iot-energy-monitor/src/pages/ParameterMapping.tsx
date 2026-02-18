import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { parameterService, ParameterMappingItem } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Plus, Trash2, MapPin, Tag, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

const ParameterMapping: React.FC = () => {
  const toast = useToast();
  const { setParameterMapping } = useApp();
  const [mappings, setMappings] = useState<ParameterMappingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('');

  const loadMappings = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const allMappings = await parameterService.getAllMappings();
      setMappings(allMappings);
      
      // Update context with legacy format
      const mappingObj: Record<string, string> = {};
      allMappings.forEach(m => {
        mappingObj[m.hardware_key] = m.ui_label;
      });
      setParameterMapping(mappingObj);
    } catch (err: any) {
      setError(err.message || 'Failed to load parameter mappings');
    } finally {
      setLoading(false);
    }
  }, [setParameterMapping]);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  const handleAdd = async () => {
    if (!key?.trim() || !label?.trim()) {
      setError('Hardware key and display label are required.');
      return;
    }
    
    try {
      setError('');
      await parameterService.createMapping(key.trim(), label.trim(), unit.trim() || undefined);
      await loadMappings();
      setKey('');
      setLabel('');
      setUnit('');
      setOpen(false);
      toast.success('Parameter mapping added. It will appear on the Dashboard and in Reports.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create parameter mapping';
      setError(message);
      toast.error(message);
    }
  };

  const handleDelete = async (mappingId: number) => {
    if (!window.confirm('Are you sure you want to delete this mapping? It will no longer show on the Dashboard.')) {
      return;
    }
    
    try {
      setError('');
      await parameterService.deleteMapping(mappingId);
      await loadMappings();
      toast.success('Parameter mapping removed.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete parameter mapping';
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Parameter Key Configuration</h1>
            <p className="text-slate-600">
              Map hardware JSON keys to user-friendly UI labels for meter-agnostic display
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={loadMappings}
              disabled={loading}
              className="border-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mappings Card */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <span>Current Parameter Mappings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-slate-600 font-medium">Loading mappings...</p>
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No mappings configured</p>
              <p className="text-slate-500 text-sm mt-2">Add your first mapping to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Tag className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold bg-slate-100 text-slate-800 px-2 py-1 rounded">
                          {mapping.hardware_key}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-900">{mapping.ui_label}</span>
                        {mapping.unit && (
                          <span className="text-xs text-slate-500">({mapping.unit})</span>
                        )}
                      </div>
                      {mapping.description && (
                        <p className="text-xs text-slate-500 mt-1">{mapping.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(mapping.id)}
                    className="ml-3"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Mapping Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader onClose={() => setOpen(false)}>
            <DialogTitle className="text-2xl font-bold">Add Parameter Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <label htmlFor="key" className="block text-sm font-semibold text-slate-700 mb-2">
                <Tag className="h-4 w-4 inline mr-1" />
                Hardware JSON Key
              </label>
              <Input
                id="key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Hardware key (e.g. v, a, pf)"
                className="h-11"
              />
              <p className="text-xs text-slate-500 mt-2">
                The key as it appears in the hardware JSON payload (e.g., "v", "a", "pf")
              </p>
            </div>
            <div>
              <label htmlFor="label" className="block text-sm font-semibold text-slate-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-1" />
                UI Label *
              </label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Display label (e.g. Voltage, Current)"
                className="h-11"
                required
              />
              <p className="text-xs text-slate-500 mt-2">
                The user-friendly label displayed in the dashboard (e.g., "Voltage", "Current")
              </p>
            </div>
            <div>
              <label htmlFor="unit" className="block text-sm font-semibold text-slate-700 mb-2">
                Unit
              </label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unit (optional)"
                className="h-11"
              />
              <p className="text-xs text-slate-500 mt-2">
                Unit of measurement (optional)
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAdd}
                disabled={!key || !label}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Add Mapping
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParameterMapping;
