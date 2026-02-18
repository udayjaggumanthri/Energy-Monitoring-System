import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { groupingService, GroupingResponse } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Building2, ChevronRight, MapPin, Layers, TrendingUp, Zap } from 'lucide-react';

const GroupedDashboards: React.FC = () => {
  const { devices, parameterMapping } = useApp();
  const [grouping, setGrouping] = useState<GroupingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    groupingService.getGrouping('sum')
      .then((data) => {
        if (!cancelled) {
          setGrouping(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load grouping');
          setGrouping({ areas: [] });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const getGroupKey = (area: string, building: string, floor: string) => {
    return `${area}-${building}-${floor}`;
  };

  const getFloorDevices = (deviceIds: number[]) => {
    return devices.filter((d) => {
      const id = typeof d.id === 'number' ? d.id : parseInt(String(d.id), 10);
      return deviceIds.includes(id);
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Grouped Dashboards</h1>
          <p className="text-slate-500">Loading hierarchy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Grouped Dashboards</h1>
            <p className="text-slate-600">
              Hierarchical view: Area → Building → Floor with aggregated Total kW
            </p>
            {error && (
              <p className="text-sm text-amber-600 mt-1">{error}</p>
            )}
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <Building2 className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Hierarchy from API (Module 6) */}
      {!grouping || grouping.areas.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Building2 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium mb-2">No grouped devices found</p>
            <p className="text-slate-500 text-sm">
              Assign Area, Building, and Floor to devices to see grouped views
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouping.areas.map((area) => (
            <Card key={area.name} className="border border-slate-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-xl">Area: {area.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {area.buildings.map((building) => (
                  <div key={building.name} className="mb-6 last:mb-0">
                    <div className="flex items-center space-x-2 mb-4 ml-4">
                      <Building2 className="h-5 w-5 text-slate-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Building: {building.name}</h3>
                    </div>
                    {building.floors.map((floor) => {
                      const groupKey = getGroupKey(area.name, building.name, floor.name);
                      const isExpanded = selectedGroup === groupKey;
                      const floorDevices = getFloorDevices(floor.device_ids);

                      return (
                        <div key={floor.name} className="ml-8 mb-4">
                          <button
                            onClick={() => setSelectedGroup(isExpanded ? null : groupKey)}
                            className="w-full flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all bg-white"
                          >
                            <div className="flex items-center space-x-3">
                              <ChevronRight
                                className={`h-5 w-5 transition-transform text-slate-400 ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                              <div className="p-2 bg-purple-100 rounded-lg">
                                <Layers className="h-4 w-4 text-purple-600" />
                              </div>
                              <div className="text-left">
                                <span className="font-semibold text-slate-900">Floor: {floor.name}</span>
                                <span className="text-sm text-slate-500 ml-2">
                                  ({floor.device_count} device{floor.device_count !== 1 ? 's' : ''})
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="text-xs text-slate-500 mb-1">Total Power</div>
                                <div className="flex items-center space-x-2">
                                  <TrendingUp className="h-5 w-5 text-purple-600" />
                                  <span className="text-xl font-bold text-purple-600">
                                    {floor.total_kw.toFixed(2)} kW
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="ml-12 mt-3 space-y-3">
                              {floorDevices.map((device) => (
                                <Card key={device.id} className="bg-slate-50 border border-slate-200">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                          <Zap className="h-4 w-4 text-blue-600" />
                                        </div>
                                        <div>
                                          <div className="font-semibold text-slate-900">{device.name}</div>
                                          <div className="text-xs text-slate-500">
                                            {device.hardwareAddress || device.hardware_address}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right space-y-1">
                                        {device.parameters && Object.entries(device.parameters).slice(0, 20).map(([key, value]) => {
                                          const label = parameterMapping[key] || key;
                                          return (
                                            <div key={key} className="text-sm">
                                              <span className="text-slate-600">{label}:</span>{' '}
                                              <span className="font-semibold text-slate-900">
                                                {typeof value === 'number' ? value.toFixed(2) : value}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupedDashboards;
