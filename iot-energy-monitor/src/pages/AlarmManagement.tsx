import React from 'react';
import { useApp } from '../contexts/AppContext';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { AlertTriangle, CheckCircle, Clock, Zap, Bell } from 'lucide-react';
import { format } from 'date-fns';

const AlarmManagement: React.FC = () => {
  const { alarms, acknowledgeAlarm } = useApp();
  const unacknowledged = alarms.filter(a => !a.acknowledged);
  const acknowledged = alarms.filter(a => a.acknowledged);

  const handleAcknowledge = async (alarmId: string) => {
    await acknowledgeAlarm(alarmId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Alarm Management</h1>
            <p className="text-slate-600">
              View and acknowledge threshold breach alarms
            </p>
          </div>
          {unacknowledged.length > 0 && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <Bell className="h-5 w-5 text-red-600" />
              <span className="text-red-600 font-semibold">{unacknowledged.length} Active Alarms</span>
            </div>
          )}
        </div>
      </div>

      {/* Unacknowledged Alarms */}
      {unacknowledged.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-2xl font-bold text-slate-900">
              Unacknowledged Alarms ({unacknowledged.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {unacknowledged.map((alarm) => (
              <Card 
                key={alarm.id} 
                className="border-2 border-red-500 shadow-lg bg-gradient-to-r from-red-50 to-white"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{alarm.deviceName}</h3>
                          <p className="text-sm text-slate-500">Device ID: {alarm.deviceId}</p>
                        </div>
                      </div>
                      <div className="space-y-2 ml-12">
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            <strong>Parameter:</strong> <span className="font-semibold">{alarm.parameterLabel}</span>
                            <span className="text-slate-400 ml-2">({alarm.parameterKey})</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-slate-600">
                            <strong>Value:</strong>{' '}
                            <span className="font-bold text-red-600 text-lg">
                              {alarm.value.toFixed(2)}
                            </span>
                            {' '}exceeded{' '}
                            <span className="font-semibold text-slate-900">
                              {alarm.type === 'max' ? 'maximum' : 'minimum'}
                            </span>{' '}
                            threshold of <span className="font-semibold">{alarm.threshold.toFixed(2)}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-500">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">
                            {format(new Date(alarm.timestamp), 'PPpp')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleAcknowledge(alarm.id)}
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Acknowledge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledged Alarms */}
      {acknowledged.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-slate-900">
              Acknowledged Alarms ({acknowledged.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {acknowledged.map((alarm) => (
              <Card key={alarm.id} className="border border-slate-200 opacity-75 hover:opacity-100 transition-opacity">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-slate-900">{alarm.deviceName}</span>
                      </div>
                      <div className="space-y-1 text-sm ml-7">
                        <p className="text-slate-600">
                          <strong>Parameter:</strong> {alarm.parameterLabel}
                        </p>
                        <p className="text-slate-600">
                          <strong>Value:</strong> <span className="font-semibold">{alarm.value.toFixed(2)}</span>
                          {' '}(Threshold: {alarm.threshold.toFixed(2)})
                        </p>
                        <p className="text-slate-500 text-xs">
                          {format(new Date(alarm.timestamp), 'PPpp')}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                      Acknowledged
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {alarms.length === 0 && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium mb-2">No alarms to display</p>
            <p className="text-slate-500 text-sm">All systems operating normally</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AlarmManagement;
