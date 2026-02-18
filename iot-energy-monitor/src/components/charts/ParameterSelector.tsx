import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Activity } from 'lucide-react';

interface ParameterSelectorProps {
  availableParameters: string[];
  selectedParameters: string[];
  parameterMapping: Record<string, string>;
  onParameterToggle: (parameter: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const ParameterSelector: React.FC<ParameterSelectorProps> = ({
  availableParameters,
  selectedParameters,
  parameterMapping,
  onParameterToggle,
  onSelectAll,
  onDeselectAll
}) => {
  if (availableParameters.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center">
            <Activity className="h-4 w-4 mr-2 text-blue-600" />
            Select Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-xs text-slate-500">No parameters available for this device.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center">
            <Activity className="h-4 w-4 mr-2 text-blue-600" />
            Parameters ({selectedParameters.length}/{availableParameters.length})
          </CardTitle>
          <div className="flex items-center space-x-2">
            <button
              onClick={onSelectAll}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded transition-colors"
            >
              All
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={onDeselectAll}
              className="text-xs text-slate-600 hover:text-slate-700 font-medium px-2 py-1 hover:bg-slate-50 rounded transition-colors"
            >
              None
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {availableParameters.map((paramKey) => {
            const isSelected = selectedParameters.includes(paramKey);
            const label = parameterMapping[paramKey] || paramKey;

            return (
              <label
                key={paramKey}
                className={`flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onParameterToggle(paramKey)}
                  className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium block truncate ${
                    isSelected ? 'text-blue-900' : 'text-slate-700'
                  }`}>
                    {label}
                  </span>
                  <p className="text-xs text-slate-400 font-mono truncate">{paramKey}</p>
                </div>
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ParameterSelector;
