import React, { useState } from 'react';
import { mqttService, MQTTTestConfig, MQTTTestResult, MQTTMessage } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Wifi, WifiOff, Clock, CheckCircle, XCircle, AlertCircle, Hash, Code, Package } from 'lucide-react';

interface MQTTTesterProps {
  config: MQTTTestConfig;
  onTestComplete: (result: MQTTTestResult) => void;
}

const MQTTTester: React.FC<MQTTTesterProps> = ({ config, onTestComplete }) => {
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<MQTTTestResult | null>(null);
  const [timeoutSeconds, setTimeoutSeconds] = useState(15);

  const handleTest = async () => {
    // Validate required fields
    if (!config.mqtt_broker_host?.trim()) {
      toast.error('MQTT Broker Host is required');
      return;
    }
    if (!config.mqtt_topic_prefix?.trim()) {
      toast.error('MQTT Topic Prefix is required');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const testConfig: MQTTTestConfig = {
        ...config,
        timeout_seconds: timeoutSeconds,
      };

      const testResult = await mqttService.testConnection(testConfig);
      setResult(testResult);
      onTestComplete(testResult);

      if (testResult.success) {
        if (testResult.messages.length === 0) {
          toast.info('Connection successful, but no messages received. Check your topic prefix and ensure devices are publishing data.');
        } else {
          toast.success(`Connection successful! Captured ${testResult.messages.length} message(s).`);
        }
      } else {
        toast.error(testResult.error || 'MQTT connection test failed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to test MQTT connection';
      toast.error(message);
      setResult({
        success: false,
        connection_status: 'error',
        messages: [],
        detected_hardware_addresses: [],
        all_parameter_keys: [],
        error: message,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-blue-600" />
            <span>Test MQTT Connection</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <label htmlFor="timeout" className="text-sm font-semibold text-slate-700 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Timeout (seconds):
              </label>
              <select
                id="timeout"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={testing}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </div>

            <Button
              onClick={handleTest}
              disabled={testing}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {testing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Test Server Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span>Test Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-slate-700">Connection Status:</span>
                <span className={`text-sm font-medium ${
                  result.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.connection_status}
                </span>
              </div>

              {result.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Error</p>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>
                </div>
              )}

              {result.success && (
                <>
                  {result.messages.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-blue-800 mb-1">
                            <Hash className="h-4 w-4 inline mr-1" />
                            Hardware Addresses Detected
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {result.detected_hardware_addresses.length > 0 ? (
                              result.detected_hardware_addresses.map((addr) => (
                                <span
                                  key={addr}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono"
                                >
                                  {addr}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-blue-600">None detected</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-green-800 mb-1">
                            <Package className="h-4 w-4 inline mr-1" />
                            Parameter Keys Found
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {result.all_parameter_keys.length > 0 ? (
                              result.all_parameter_keys.map((key) => (
                                <span
                                  key={key}
                                  className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-mono"
                                >
                                  {key}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-green-600">None found</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800">Captured Messages</h3>
                        {result.messages.map((message: MQTTMessage, index: number) => (
                          <div
                            key={index}
                            className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                          >
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-1">Topic:</p>
                                <code className="text-sm bg-white px-2 py-1 rounded border border-slate-300 font-mono">
                                  {message.topic}
                                </code>
                              </div>

                              {message.hardware_address && (
                                <div>
                                  <p className="text-sm font-semibold text-slate-700 mb-1">Hardware Address:</p>
                                  <code className="text-sm bg-white px-2 py-1 rounded border border-slate-300 font-mono">
                                    {message.hardware_address}
                                  </code>
                                </div>
                              )}

                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-1">Raw Payload:</p>
                                <pre className="text-xs bg-white p-3 rounded border border-slate-300 overflow-x-auto">
                                  <code>{message.raw_payload}</code>
                                </pre>
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-1">Parsed Payload:</p>
                                <pre className="text-xs bg-white p-3 rounded border border-slate-300 overflow-x-auto">
                                  <code>{JSON.stringify(message.parsed_payload, null, 2)}</code>
                                </pre>
                              </div>

                              {message.parameter_keys.length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold text-slate-700 mb-1">Parameter Keys:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {message.parameter_keys.map((key) => (
                                      <span
                                        key={key}
                                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono"
                                      >
                                        {key}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="text-xs text-slate-500">
                                Timestamp: {new Date(message.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800">
                        Connection successful, but no messages were received during the test period.
                        Please verify:
                      </p>
                      <ul className="list-disc list-inside mt-2 text-sm text-yellow-700 space-y-1">
                        <li>The topic prefix is correct</li>
                        <li>Devices are actively publishing data</li>
                        <li>The timeout duration is sufficient</li>
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MQTTTester;
