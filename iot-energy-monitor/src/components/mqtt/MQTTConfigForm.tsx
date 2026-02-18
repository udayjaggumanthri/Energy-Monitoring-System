import React, { useState } from 'react';
import { MQTTConfig } from '../../lib/api';
import Input from '../ui/Input';
import { Server, Lock, Key, Shield } from 'lucide-react';

interface MQTTConfigFormProps {
  config: MQTTConfig;
  onChange: (config: MQTTConfig) => void;
  errors?: Record<string, string>;
}

const MQTTConfigForm: React.FC<MQTTConfigFormProps> = ({ config, onChange, errors = {} }) => {
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field: keyof MQTTConfig, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="mqtt_broker_host" className="block text-sm font-semibold text-slate-700 mb-2">
            <Server className="h-4 w-4 inline mr-1" />
            MQTT Broker Host *
          </label>
          <Input
            id="mqtt_broker_host"
            value={config.mqtt_broker_host || ''}
            onChange={(e) => updateField('mqtt_broker_host', e.target.value)}
            placeholder="e.g. localhost, broker.example.com"
            className={`h-11 ${errors.mqtt_broker_host ? 'border-red-500' : ''}`}
            required
          />
          {errors.mqtt_broker_host && (
            <p className="mt-1 text-sm text-red-600" role="alert">{errors.mqtt_broker_host}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">Hostname or IP address of MQTT broker</p>
        </div>

        <div>
          <label htmlFor="mqtt_broker_port" className="block text-sm font-semibold text-slate-700 mb-2">
            <Server className="h-4 w-4 inline mr-1" />
            MQTT Broker Port *
          </label>
          <Input
            id="mqtt_broker_port"
            type="number"
            value={config.mqtt_broker_port || 1883}
            onChange={(e) => updateField('mqtt_broker_port', parseInt(e.target.value) || 1883)}
            min={1}
            max={65535}
            className={`h-11 ${errors.mqtt_broker_port ? 'border-red-500' : ''}`}
            required
          />
          {errors.mqtt_broker_port && (
            <p className="mt-1 text-sm text-red-600" role="alert">{errors.mqtt_broker_port}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">Port number (default: 1883)</p>
        </div>
      </div>

      <div>
        <label htmlFor="mqtt_topic_prefix" className="block text-sm font-semibold text-slate-700 mb-2">
          <Key className="h-4 w-4 inline mr-1" />
          MQTT Topic Prefix *
        </label>
        <Input
          id="mqtt_topic_prefix"
          value={config.mqtt_topic_prefix || ''}
          onChange={(e) => updateField('mqtt_topic_prefix', e.target.value)}
          placeholder="e.g. EM, iot/devices"
          className={`h-11 ${errors.mqtt_topic_prefix ? 'border-red-500' : ''}`}
          required
        />
        {errors.mqtt_topic_prefix && (
          <p className="mt-1 text-sm text-red-600" role="alert">{errors.mqtt_topic_prefix}</p>
        )}
        <p className="text-xs text-slate-500 mt-1">Topic prefix (e.g., EM for EM/46521)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="mqtt_username" className="block text-sm font-semibold text-slate-700 mb-2">
            <Key className="h-4 w-4 inline mr-1" />
            Username (Optional)
          </label>
          <Input
            id="mqtt_username"
            value={config.mqtt_username || ''}
            onChange={(e) => updateField('mqtt_username', e.target.value)}
            placeholder="MQTT username"
            className="h-11"
          />
          <p className="text-xs text-slate-500 mt-1">Optional MQTT broker username</p>
        </div>

        <div>
          <label htmlFor="mqtt_password" className="block text-sm font-semibold text-slate-700 mb-2">
            <Lock className="h-4 w-4 inline mr-1" />
            Password (Optional)
          </label>
          <div className="relative">
            <Input
              id="mqtt_password"
              type={showPassword ? 'text' : 'password'}
              value={config.mqtt_password || ''}
              onChange={(e) => updateField('mqtt_password', e.target.value)}
              placeholder="MQTT password"
              className="h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">Optional MQTT broker password</p>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-center space-x-3 mb-4">
          <input
            type="checkbox"
            id="mqtt_use_tls"
            checked={config.mqtt_use_tls || false}
            onChange={(e) => updateField('mqtt_use_tls', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
          />
          <label htmlFor="mqtt_use_tls" className="text-sm font-semibold text-slate-700 flex items-center">
            <Shield className="h-4 w-4 mr-1" />
            Use TLS/SSL
          </label>
        </div>
        <p className="text-xs text-slate-500 mb-4">Enable TLS/SSL encryption for MQTT connection</p>

        {config.mqtt_use_tls && (
          <div>
            <label htmlFor="mqtt_tls_ca_certs" className="block text-sm font-semibold text-slate-700 mb-2">
              TLS CA Certificate (Optional)
            </label>
            <textarea
              id="mqtt_tls_ca_certs"
              value={config.mqtt_tls_ca_certs || ''}
              onChange={(e) => updateField('mqtt_tls_ca_certs', e.target.value)}
              placeholder="Paste CA certificate content here, or leave empty to use system certificates"
              rows={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Optional CA certificate content for TLS verification
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MQTTConfigForm;
