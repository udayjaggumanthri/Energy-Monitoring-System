import React, { useState, useEffect } from 'react';
import { parameterService, ParameterMappingItem } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { MapPin, Plus, AlertCircle, CheckCircle } from 'lucide-react';

interface FieldMappingProps {
  parameterKeys: string[];
  mappings: Record<string, number>; // key -> mapping_id
  onChange: (mappings: Record<string, number>) => void;
}

const FieldMapping: React.FC<FieldMappingProps> = ({ parameterKeys, mappings, onChange }) => {
  const toast = useToast();
  const [availableMappings, setAvailableMappings] = useState<ParameterMappingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingForKey, setCreatingForKey] = useState<string | null>(null);
  const [newMappingKey, setNewMappingKey] = useState('');
  const [newMappingLabel, setNewMappingLabel] = useState('');
  const [newMappingUnit, setNewMappingUnit] = useState('');

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      setLoading(true);
      const allMappings = await parameterService.getAllMappings();
      setAvailableMappings(allMappings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load parameter mappings';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (paramKey: string, mappingId: number | '') => {
    const newMappings = { ...mappings };
    if (mappingId === '') {
      delete newMappings[paramKey];
    } else {
      newMappings[paramKey] = mappingId as number;
    }
    onChange(newMappings);
  };

  const openCreateDialog = (paramKey: string) => {
    setCreatingForKey(paramKey);
    setNewMappingKey(paramKey);
    setNewMappingLabel('');
    setNewMappingUnit('');
    setCreateDialogOpen(true);
  };

  const handleCreateMapping = async () => {
    if (!newMappingKey.trim() || !newMappingLabel.trim()) {
      toast.error('Hardware key and display label are required');
      return;
    }

    try {
      setLoading(true);
      const newMapping = await parameterService.createMapping(
        newMappingKey.trim(),
        newMappingLabel.trim(),
        newMappingUnit.trim() || undefined
      );
      
      // Reload mappings
      await loadMappings();
      
      // Auto-select the newly created mapping
      if (creatingForKey) {
        handleMappingChange(creatingForKey, newMapping.id);
      }
      
      setCreateDialogOpen(false);
      setCreatingForKey(null);
      setNewMappingKey('');
      setNewMappingLabel('');
      setNewMappingUnit('');
      
      toast.success('Parameter mapping created successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create parameter mapping';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getMappingLabel = (mappingId: number): string => {
    const mapping = availableMappings.find(m => m.id === mappingId);
    return mapping ? mapping.ui_label : 'Unknown';
  };

  const isMapped = (paramKey: string): boolean => {
    return paramKey in mappings && mappings[paramKey] !== undefined;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <MapPin className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-slate-800">Map Parameter Keys to Labels</h3>
      </div>

      {parameterKeys.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            No parameter keys detected. Please test the MQTT connection first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {parameterKeys.map((paramKey) => {
            const mappingId = mappings[paramKey];
            const mapped = isMapped(paramKey);

            return (
              <div
                key={paramKey}
                className={`border rounded-lg p-4 ${
                  mapped
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <code className="text-sm font-mono font-semibold bg-white px-2 py-1 rounded border">
                        {paramKey}
                      </code>
                      {mapped && (
                        <span className="text-xs text-green-700 flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mapped to: {getMappingLabel(mappingId)}
                        </span>
                      )}
                      {!mapped && (
                        <span className="text-xs text-red-700 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Unmapped
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={mappingId || ''}
                        onChange={(e) => handleMappingChange(paramKey, e.target.value ? parseInt(e.target.value) : '')}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        disabled={loading}
                      >
                        <option value="">-- Select Mapping --</option>
                        {availableMappings.map((mapping) => (
                          <option key={mapping.id} value={mapping.id}>
                            {mapping.ui_label} {mapping.unit ? `(${mapping.unit})` : ''}
                          </option>
                        ))}
                      </select>

                      <Button
                        variant="outline"
                        onClick={() => openCreateDialog(paramKey)}
                        disabled={loading}
                        className="border-slate-300"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create New
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Parameter Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label htmlFor="new_mapping_key" className="block text-sm font-semibold text-slate-700 mb-2">
                Hardware Key *
              </label>
              <Input
                id="new_mapping_key"
                value={newMappingKey}
                onChange={(e) => setNewMappingKey(e.target.value)}
                placeholder="e.g. v, a, pf"
                className="h-11"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Key sent by hardware device</p>
            </div>

            <div>
              <label htmlFor="new_mapping_label" className="block text-sm font-semibold text-slate-700 mb-2">
                Display Label *
              </label>
              <Input
                id="new_mapping_label"
                value={newMappingLabel}
                onChange={(e) => setNewMappingLabel(e.target.value)}
                placeholder="e.g. Voltage, Current"
                className="h-11"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Label shown in UI</p>
            </div>

            <div>
              <label htmlFor="new_mapping_unit" className="block text-sm font-semibold text-slate-700 mb-2">
                Unit (Optional)
              </label>
              <Input
                id="new_mapping_unit"
                value={newMappingUnit}
                onChange={(e) => setNewMappingUnit(e.target.value)}
                placeholder="e.g. V, A, kW"
                className="h-11"
              />
              <p className="text-xs text-slate-500 mt-1">Unit of measurement</p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setCreatingForKey(null);
                }}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateMapping}
                disabled={loading || !newMappingKey.trim() || !newMappingLabel.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {loading ? 'Creating...' : 'Create Mapping'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FieldMapping;
