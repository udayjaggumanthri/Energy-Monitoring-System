import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { mqttService, MQTTConfig, MQTTTestResult } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import MQTTConfigForm from '../components/mqtt/MQTTConfigForm';
import MQTTTester from '../components/mqtt/MQTTTester';
import FieldMapping from '../components/mqtt/FieldMapping';
import Input from '../components/ui/Input';
import { ArrowLeft, ArrowRight, CheckCircle, Circle, Zap, MapPin, Building2, Layers, Hash } from 'lucide-react';

const MQTTRegisterDevice: React.FC = () => {
  const navigate = useNavigate();
  const { refreshDevices } = useApp();
  const toast = useToast();

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Step 1: MQTT Configuration
  const [mqttConfig, setMqttConfig] = useState<MQTTConfig>({
    mqtt_broker_host: '',
    mqtt_broker_port: 1883,
    mqtt_topic_prefix: '',
    mqtt_username: '',
    mqtt_password: '',
    mqtt_use_tls: false,
    mqtt_tls_ca_certs: '',
  });
  const [mqttConfigErrors, setMqttConfigErrors] = useState<Record<string, string>>({});

  // Step 2: Test Results
  const [testResult, setTestResult] = useState<MQTTTestResult | null>(null);

  // Step 3: Field Mappings
  const [fieldMappings, setFieldMappings] = useState<Record<string, number>>({});

  // Step 4: Device Details
  const [hardwareAddress, setHardwareAddress] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [area, setArea] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [deviceErrors, setDeviceErrors] = useState<Record<string, string>>({});

  // Loading state
  const [loading, setLoading] = useState(false);

  const validateMQTTConfig = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!mqttConfig.mqtt_broker_host?.trim()) {
      errors.mqtt_broker_host = 'MQTT Broker Host is required';
    }
    if (!mqttConfig.mqtt_topic_prefix?.trim()) {
      errors.mqtt_topic_prefix = 'MQTT Topic Prefix is required';
    }
    if (mqttConfig.mqtt_broker_port < 1 || mqttConfig.mqtt_broker_port > 65535) {
      errors.mqtt_broker_port = 'Port must be between 1 and 65535';
    }

    setMqttConfigErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateDeviceDetails = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!hardwareAddress.trim()) {
      errors.hardwareAddress = 'Hardware address is required';
    } else if (!/^\d{5}$/.test(hardwareAddress.trim())) {
      errors.hardwareAddress = 'Hardware address must be exactly 5 digits';
    }
    
    if (!deviceName.trim()) {
      errors.deviceName = 'Device name is required';
    }

    setDeviceErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateMQTTConfig()) {
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!testResult || !testResult.success) {
        toast.error('Please test the MQTT connection successfully before proceeding');
        return;
      }
      if (testResult.messages.length === 0) {
        toast.error('No messages received. Please ensure devices are publishing data.');
        return;
      }
      // Auto-fill hardware address if detected
      if (testResult.detected_hardware_addresses.length === 1) {
        setHardwareAddress(testResult.detected_hardware_addresses[0]);
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const unmappedKeys = testResult?.all_parameter_keys.filter(
        key => !(key in fieldMappings)
      ) || [];
      if (unmappedKeys.length > 0) {
        const proceed = window.confirm(
          `Some parameter keys are not mapped: ${unmappedKeys.join(', ')}. ` +
          'You can still proceed, but unmapped keys will not display properly. Continue?'
        );
        if (!proceed) {
          return;
        }
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!validateDeviceDetails()) {
        return;
      }
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!testResult || !testResult.success) {
      toast.error('Invalid test results. Please test the connection again.');
      return;
    }

    setLoading(true);
    try {
      await mqttService.registerDeviceFromMQTT(
        hardwareAddress.trim(),
        deviceName.trim(),
        mqttConfig,
        fieldMappings,
        area.trim() || undefined,
        building.trim() || undefined,
        floor.trim() || undefined
      );

      await refreshDevices();
      toast.success('Device registered successfully! It will appear on the Dashboard.');
      setCurrentStep(5);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register device';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <CardTitle>Step 1: Configure MQTT Server</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <MQTTConfigForm
                config={mqttConfig}
                onChange={setMqttConfig}
                errors={mqttConfigErrors}
              />
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <MQTTTester
            config={mqttConfig}
            onTestComplete={(result) => {
              setTestResult(result);
            }}
          />
        );

      case 3:
        return (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <CardTitle>Step 3: Map Fields to Parameter Mappings</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <FieldMapping
                parameterKeys={testResult?.all_parameter_keys || []}
                mappings={fieldMappings}
                onChange={setFieldMappings}
              />
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <CardTitle>Step 4: Device Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="hardwareAddress" className="block text-sm font-semibold text-slate-700 mb-2">
                      <Hash className="h-4 w-4 inline mr-1" />
                      Hardware Address (5 digits) *
                    </label>
                    <Input
                      id="hardwareAddress"
                      value={hardwareAddress}
                      onChange={(e) => {
                        setHardwareAddress(e.target.value);
                        setDeviceErrors({ ...deviceErrors, hardwareAddress: '' });
                      }}
                      placeholder="e.g. 46542"
                      maxLength={5}
                      pattern="\d{5}"
                      className={`h-11 ${deviceErrors.hardwareAddress ? 'border-red-500' : ''}`}
                      required
                    />
                    {deviceErrors.hardwareAddress && (
                      <p className="mt-1 text-sm text-red-600" role="alert">
                        {deviceErrors.hardwareAddress}
                      </p>
                    )}
                    {testResult?.detected_hardware_addresses.length === 1 && (
                      <p className="text-xs text-blue-600 mt-1">
                        Detected from MQTT: {testResult.detected_hardware_addresses[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="deviceName" className="block text-sm font-semibold text-slate-700 mb-2">
                      <Zap className="h-4 w-4 inline mr-1" />
                      Device Name *
                    </label>
                    <Input
                      id="deviceName"
                      value={deviceName}
                      onChange={(e) => {
                        setDeviceName(e.target.value);
                        setDeviceErrors({ ...deviceErrors, deviceName: '' });
                      }}
                      placeholder="e.g. Main Meter"
                      className={`h-11 ${deviceErrors.deviceName ? 'border-red-500' : ''}`}
                      required
                    />
                    {deviceErrors.deviceName && (
                      <p className="mt-1 text-sm text-red-600" role="alert">
                        {deviceErrors.deviceName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="area" className="block text-sm font-semibold text-slate-700 mb-2">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Area
                    </label>
                    <Input
                      id="area"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="Area (optional)"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label htmlFor="building" className="block text-sm font-semibold text-slate-700 mb-2">
                      <Building2 className="h-4 w-4 inline mr-1" />
                      Building
                    </label>
                    <Input
                      id="building"
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                      placeholder="Building (optional)"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label htmlFor="floor" className="block text-sm font-semibold text-slate-700 mb-2">
                      <Layers className="h-4 w-4 inline mr-1" />
                      Floor
                    </label>
                    <Input
                      id="floor"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      placeholder="Floor (optional)"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Review Summary</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Broker:</strong> {mqttConfig.mqtt_broker_host}:{mqttConfig.mqtt_broker_port}</p>
                    <p><strong>Topic Prefix:</strong> {mqttConfig.mqtt_topic_prefix}</p>
                    <p><strong>Hardware Address:</strong> {hardwareAddress || 'Not set'}</p>
                    <p><strong>Parameter Keys Mapped:</strong> {Object.keys(fieldMappings).length} / {testResult?.all_parameter_keys.length || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="border border-green-200 shadow-sm bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Device Registered Successfully!</h2>
              <p className="text-green-700 mb-6">
                The device "{deviceName}" has been registered and will start receiving data from the MQTT broker.
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Button
                  onClick={() => navigate('/devices')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  View Devices
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset form
                    setCurrentStep(1);
                    setMqttConfig({
                      mqtt_broker_host: '',
                      mqtt_broker_port: 1883,
                      mqtt_topic_prefix: '',
                      mqtt_username: '',
                      mqtt_password: '',
                      mqtt_use_tls: false,
                      mqtt_tls_ca_certs: '',
                    });
                    setTestResult(null);
                    setFieldMappings({});
                    setHardwareAddress('');
                    setDeviceName('');
                    setArea('');
                    setBuilding('');
                    setFloor('');
                  }}
                  className="border-slate-300"
                >
                  Register Another Device
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="outline"
            onClick={() => navigate('/devices')}
            className="border-slate-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <nav className="text-sm text-slate-500 mb-1" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => navigate('/devices')}
                className="hover:text-blue-600 focus:outline-none"
              >
                Devices
              </button>
              <span className="mx-2">/</span>
              <span className="text-slate-700 font-medium">Register via MQTT</span>
            </nav>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Register Device via MQTT</h1>
            <p className="text-slate-600">
              Configure MQTT broker settings, test connection, map fields, and register your device
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mt-6">
          {[1, 2, 3, 4, 5].map((step) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step < currentStep
                      ? 'bg-green-500 border-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-slate-300 text-slate-400'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{step}</span>
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    step <= currentStep ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {step === 1 && 'Configure'}
                  {step === 2 && 'Test'}
                  {step === 3 && 'Map Fields'}
                  {step === 4 && 'Details'}
                  {step === 5 && 'Complete'}
                </span>
              </div>
              {step < totalSteps && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    step < currentStep ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="border-slate-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {currentStep === 4 ? (
              loading ? (
                'Registering...'
              ) : (
                'Register Device'
              )
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MQTTRegisterDevice;
