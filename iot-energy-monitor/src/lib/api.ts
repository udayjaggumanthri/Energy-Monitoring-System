// API service - Integrated with Django DRF backend

import { apiClient } from './apiClient';

// Device interface matching Django backend DeviceSerializer
export interface Device {
  id: number;
  hardware_address: string;
  name: string;
  description?: string;
  area?: string;
  building?: string;
  floor?: string;
  is_active: boolean;
  assigned_users?: User[];
  assigned_user_ids?: number[];
  created_at?: string;
  updated_at?: string;
  last_data_received?: string;
  // Legacy fields for compatibility
  hardwareAddress?: string; // Computed from hardware_address
  lastUpdate?: string; // Computed from last_data_received
  parameters?: Record<string, number>; // For real-time data
  // MQTT configuration fields
  mqtt_broker_host?: string;
  mqtt_broker_port?: number;
  mqtt_topic_prefix?: string;
  mqtt_topic_pattern?: string;
  mqtt_username?: string;
  mqtt_use_tls?: boolean;
  mqtt_tls_ca_certs?: string;
}

// User interface matching Django backend UserSerializer
export interface User {
  id: number;
  username: string;
  email?: string;
  mobile?: string;
  role: 'super_admin' | 'admin' | 'user';
  role_display?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at?: string;
  updated_at?: string;
  assigned_device_ids?: number[];
  assignedDevices?: string[];
  // Computed property for display name
  name?: string;
}

/** Normalize API user: ensure assignedDevices from assigned_device_ids for UI */
function normalizeUser<T extends User>(user: T): T {
  const assignedDevices = Array.isArray(user.assignedDevices)
    ? user.assignedDevices
    : (user.assigned_device_ids ?? []).map(String);
  return { ...user, assignedDevices };
}

// Parameter Mapping interface matching Django backend
export interface ParameterMapping {
  [key: string]: string; // hardware key -> UI label (for backward compatibility)
}

export interface ParameterMappingItem {
  id: number;
  hardware_key: string;
  ui_label: string;
  unit?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Threshold {
  id?: number;
  deviceId: string | number;
  parameterKey: string;
  min?: number;
  max?: number;
}

export interface Alarm {
  id: string;
  deviceId: string | number; // Support both string and number IDs
  deviceName: string;
  parameterKey: string;
  parameterLabel: string;
  value: number;
  threshold: number;
  type: 'min' | 'max';
  timestamp: string;
  acknowledged: boolean;
}

// MQTT Configuration interfaces
export interface MQTTConfig {
  mqtt_broker_host: string;
  mqtt_broker_port: number;
  mqtt_topic_prefix: string;
  mqtt_topic_pattern?: string;
  mqtt_username?: string;
  mqtt_password?: string;
  mqtt_use_tls?: boolean;
  mqtt_tls_ca_certs?: string;
}

export interface MQTTTestConfig extends MQTTConfig {
  timeout_seconds?: number;
}

export interface MQTTMessage {
  topic: string;
  raw_payload: string;
  parsed_payload: Record<string, any>;
  hardware_address: string;
  parameter_keys: string[];
  timestamp: string;
}

export interface MQTTTestResult {
  success: boolean;
  connection_status: string;
  messages: MQTTMessage[];
  detected_hardware_addresses: string[];
  all_parameter_keys: string[];
  error?: string;
}

const FALLBACK_BRANDING = { logo: '', title: 'IoT Energy Monitoring System' };

// Authentication Service - Django DRF Integration
export const authService = {
  login: async (emailOrMobile: string, password: string): Promise<User | null> => {
    const response = await apiClient.post<{
      message: string;
      user: User;
      tokens: {
        access: string;
        refresh: string;
      };
    }>('/auth/login/', {
      email_or_mobile: emailOrMobile,
      password: password,
    });

    if (response.error || !response.data) {
      const err = new Error(response.error || 'Login failed') as Error & { details?: Record<string, string[]> };
      err.details = response.details;
      throw err;
    }

    const { user, tokens } = response.data;
    
    // Store tokens (required for auth)
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);

    const displayUser = normalizeUser({
      ...user,
      name: user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name || user.username,
    });
    // User source of truth is DB; we do not cache in localStorage
    return displayUser;
  },

  logout: () => {
    apiClient.logout();
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    const response = await apiClient.get<User>('/auth/users/me/');
    if (response.data) {
      const user = response.data;
      const displayUser = normalizeUser({
        ...user,
        name: user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.first_name || user.last_name || user.username,
      });
      // User source of truth is DB; we do not cache in localStorage
      return displayUser;
    }
    return null;
  },
  
  refreshToken: async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return false;
    }
    
    const response = await apiClient.post<{ access: string }>('/auth/token/refresh/', {
      refresh: refreshToken,
    });
    
    if (response.data?.access) {
      localStorage.setItem('access_token', response.data.access);
      return true;
    }
    
    return false;
  }
};

// Device Service - Django DRF Integration
export const deviceService = {
  getAllDevices: async (filters?: {
    area?: string;
    building?: string;
    floor?: string;
    is_active?: boolean;
  }): Promise<Device[]> => {
    let endpoint = '/devices/';
    const params = new URLSearchParams();
    params.append('page_size', '500');

    if (filters) {
      if (filters.area) params.append('area', filters.area);
      if (filters.building) params.append('building', filters.building);
      if (filters.floor) params.append('floor', filters.floor);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    }

    endpoint += `?${params.toString()}`;

    const response = await apiClient.get<{
      count: number;
      results: Device[];
    }>(endpoint);
    
    if (response.error || !response.data) {
      // Don't throw for authentication errors - return empty array instead
      if (response.error?.includes('Authentication') || response.error?.includes('credentials')) {
        return [];
      }
      throw new Error(response.error || 'Failed to fetch devices');
    }
    
    // Transform devices to include legacy fields for compatibility
    return response.data.results.map(device => ({
      ...device,
      hardwareAddress: device.hardware_address,
      lastUpdate: device.last_data_received,
      parameters: {}, // Will be populated from real-time data
    }));
  },
  
  getDevice: async (id: number): Promise<Device> => {
    const response = await apiClient.get<Device>(`/devices/${id}/`);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch device');
    }
    
    const device = response.data;
    return {
      ...device,
      hardwareAddress: device.hardware_address,
      lastUpdate: device.last_data_received,
      parameters: {},
    };
  },
  
  registerDevice: async (
    hardwareAddress: string,
    name: string,
    area?: string,
    building?: string,
    floor?: string,
    description?: string,
    assignedUserIds?: number[]
  ): Promise<Device> => {
    const response = await apiClient.post<{
      message: string;
      device: Device;
    }>('/devices/', {
      hardware_address: hardwareAddress,
      name,
      area: area || undefined,
      building: building || undefined,
      floor: floor || undefined,
      description: description || undefined,
      is_active: true,
      assigned_user_ids: assignedUserIds || [],
    });
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to register device');
    }
    
    const device = response.data.device;
    return {
      ...device,
      hardwareAddress: device.hardware_address,
      lastUpdate: device.last_data_received,
      parameters: {},
    };
  },
  
  updateDevice: async (
    id: number,
    updates: Partial<Device>
  ): Promise<Device> => {
    const updateData: any = {};
    
    // Handle name - required field
    if (updates.name !== undefined) {
      const trimmedName = String(updates.name).trim();
      if (!trimmedName) {
        throw new Error('Device name is required');
      }
      updateData.name = trimmedName;
    }
    
    // Handle optional fields - convert empty strings to null
    if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
    if (updates.area !== undefined) updateData.area = updates.area?.trim() || null;
    if (updates.building !== undefined) updateData.building = updates.building?.trim() || null;
    if (updates.floor !== undefined) updateData.floor = updates.floor?.trim() || null;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.assigned_user_ids) updateData.assigned_user_ids = updates.assigned_user_ids;
    
    // MQTT configuration fields - convert empty strings to null
    if (updates.mqtt_topic_pattern !== undefined) {
      updateData.mqtt_topic_pattern = updates.mqtt_topic_pattern?.trim() || null;
    }
    if (updates.mqtt_broker_host !== undefined) {
      updateData.mqtt_broker_host = updates.mqtt_broker_host?.trim() || null;
    }
    if (updates.mqtt_broker_port !== undefined) {
      updateData.mqtt_broker_port = updates.mqtt_broker_port || null;
    }
    if (updates.mqtt_topic_prefix !== undefined) {
      updateData.mqtt_topic_prefix = updates.mqtt_topic_prefix?.trim() || null;
    }
    
    const response = await apiClient.put<Device>(`/devices/${id}/`, updateData);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update device');
    }
    
    const device = response.data;
    return {
      ...device,
      hardwareAddress: device.hardware_address,
      lastUpdate: device.last_data_received,
      parameters: {},
    };
  },
  
  deleteDevice: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`/devices/${id}/`);
    
    if (response.error) {
      throw new Error(response.error || 'Failed to delete device');
    }
  },
  
  updateDeviceData: async (hardwareAddress: string, data: Record<string, number>): Promise<Device | null> => {
    // Find device by hardware address first
    const devices = await deviceService.getAllDevices();
    const device = devices.find(d => d.hardware_address === hardwareAddress || d.hardwareAddress === hardwareAddress);
    
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Send data to backend
    const response = await apiClient.post<{
      message: string;
      data: {
        device: number;
        parameters: Record<string, number>;
        timestamp: string;
      };
    }>('/device-data/', {
      device: device.id,
      parameters: data,
    });
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update device data');
    }
    
    // Return updated device
    return await deviceService.getDevice(device.id);
  },
  
  assignDeviceToUser: async (deviceId: number, userId: number): Promise<boolean> => {
    try {
      const device = await deviceService.getDevice(deviceId);
      const currentUserIds = device.assigned_user_ids || [];
      
      if (!currentUserIds.includes(userId)) {
        await deviceService.updateDevice(deviceId, {
          assigned_user_ids: [...currentUserIds, userId],
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  },
  
  unassignDeviceFromUser: async (deviceId: number, userId: number): Promise<boolean> => {
    try {
      const device = await deviceService.getDevice(deviceId);
      const currentUserIds = device.assigned_user_ids || [];
      
      await deviceService.updateDevice(deviceId, {
        assigned_user_ids: currentUserIds.filter(id => id !== userId),
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  /** GET /api/device-data/latest/ - latest parameters and timestamp per device (Module 3 dashboard) */
  getLatestDeviceData: async (): Promise<Record<string, { parameters: Record<string, number>; timestamp: string }>> => {
    const response = await apiClient.get<Record<string, { parameters: Record<string, number>; timestamp: string }>>(
      '/device-data/latest/'
    );
    if (response.error || response.data === undefined) {
      if (response.error?.includes('Authentication') || response.error?.includes('credentials')) {
        return {};
      }
      throw new Error(response.error || 'Failed to fetch latest device data');
    }
    return response.data;
  },
};

// MQTT Service - MQTT device registration and testing
export const mqttService = {
  testConnection: async (config: MQTTTestConfig): Promise<MQTTTestResult> => {
    const response = await apiClient.post<MQTTTestResult>('/devices/test-mqtt/', {
      mqtt_broker_host: config.mqtt_broker_host,
      mqtt_broker_port: config.mqtt_broker_port,
      mqtt_topic_prefix: config.mqtt_topic_prefix,
      mqtt_username: config.mqtt_username || null,
      mqtt_password: config.mqtt_password || null,
      mqtt_use_tls: config.mqtt_use_tls || false,
      mqtt_tls_ca_certs: config.mqtt_tls_ca_certs || null,
      timeout_seconds: config.timeout_seconds || 15,
    });
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to test MQTT connection');
    }
    
    return response.data;
  },
  
  registerDeviceFromMQTT: async (
    hardwareAddress: string,
    name: string,
    mqttConfig: MQTTConfig,
    fieldMappings: Record<string, number>,
    area?: string,
    building?: string,
    floor?: string
  ): Promise<Device> => {
    const response = await apiClient.post<{
      message: string;
      device: Device;
    }>('/devices/register-from-mqtt/', {
      hardware_address: hardwareAddress,
      name,
      area: area || null,
      building: building || null,
      floor: floor || null,
      mqtt_config: {
        mqtt_broker_host: mqttConfig.mqtt_broker_host,
        mqtt_broker_port: mqttConfig.mqtt_broker_port,
        mqtt_topic_prefix: mqttConfig.mqtt_topic_prefix,
        mqtt_topic_pattern: mqttConfig.mqtt_topic_pattern || `${mqttConfig.mqtt_topic_prefix}/${hardwareAddress}`,
        mqtt_username: mqttConfig.mqtt_username || null,
        mqtt_password: mqttConfig.mqtt_password || null,
        mqtt_use_tls: mqttConfig.mqtt_use_tls || false,
        mqtt_tls_ca_certs: mqttConfig.mqtt_tls_ca_certs || null,
      },
      field_mappings: fieldMappings,
    });
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to register device from MQTT');
    }
    
    const device = response.data.device;
    return {
      ...device,
      hardwareAddress: device.hardware_address,
      lastUpdate: device.last_data_received,
      parameters: {},
    };
  },
  
  getDeviceMQTTConfig: async (deviceId: number): Promise<MQTTConfig> => {
    const response = await apiClient.get<MQTTConfig>(`/devices/${deviceId}/mqtt-config/`);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to get device MQTT configuration');
    }
    
    return response.data;
  },
};

// Parameter Mapping Service - Django DRF Integration
export const parameterService = {
  getAllMappings: async (): Promise<ParameterMappingItem[]> => {
    const response = await apiClient.get<{
      count: number;
      results: ParameterMappingItem[];
    }>('/parameter-mappings/');
    
    if (response.error || !response.data) {
      // Don't throw for authentication errors - return empty array instead
      if (response.error?.includes('Authentication') || response.error?.includes('credentials')) {
        return [];
      }
      throw new Error(response.error || 'Failed to fetch parameter mappings');
    }
    
    return response.data.results;
  },
  
  getMapping: async (): Promise<ParameterMapping> => {
    try {
      // Get all mappings and convert to legacy format
      const mappings = await parameterService.getAllMappings();
      const mappingObj: ParameterMapping = {};
      
      mappings.forEach(mapping => {
        mappingObj[mapping.hardware_key] = mapping.ui_label;
      });
      
      return mappingObj;
    } catch (error: any) {
      // Return empty mapping if authentication fails
      if (error?.message?.includes('Authentication') || error?.message?.includes('credentials')) {
        return {};
      }
      throw error;
    }
  },
  
  getMappingItem: async (id: number): Promise<ParameterMappingItem> => {
    const response = await apiClient.get<ParameterMappingItem>(`/parameter-mappings/${id}/`);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch parameter mapping');
    }
    
    return response.data;
  },
  
  createMapping: async (
    hardwareKey: string,
    uiLabel: string,
    unit?: string,
    description?: string
  ): Promise<ParameterMappingItem> => {
    const response = await apiClient.post<{
      message: string;
      mapping: ParameterMappingItem;
    }>('/parameter-mappings/', {
      hardware_key: hardwareKey,
      ui_label: uiLabel,
      unit: unit || undefined,
      description: description || undefined,
    });
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to create parameter mapping');
    }
    
    return response.data.mapping;
  },
  
  updateMapping: async (
    id: number,
    updates: Partial<ParameterMappingItem>
  ): Promise<ParameterMappingItem> => {
    const response = await apiClient.put<ParameterMappingItem>(`/parameter-mappings/${id}/`, updates);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update parameter mapping');
    }
    
    return response.data;
  },
  
  deleteMapping: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`/parameter-mappings/${id}/`);
    
    if (response.error) {
      throw new Error(response.error || 'Failed to delete parameter mapping');
    }
  },
  
  // Legacy method for backward compatibility
  updateMappingLegacy: async (mapping: ParameterMapping): Promise<void> => {
    // Get all existing mappings
    const existingMappings = await parameterService.getAllMappings();
    const existingKeys = new Set(existingMappings.map(m => m.hardware_key));
    
    // Create new mappings
    for (const [key, label] of Object.entries(mapping)) {
      if (!existingKeys.has(key)) {
        await parameterService.createMapping(key, label);
      }
    }
    
    // Delete mappings that are no longer in the new mapping
    for (const existing of existingMappings) {
      if (!(existing.hardware_key in mapping)) {
        await parameterService.deleteMapping(existing.id);
      }
    }
  }
};

// Threshold Service (Module 5 - backend API)
function mapThresholdFromApi(t: { id?: number; device: number; device_id?: number; parameter_key: string; min?: number | null; max?: number | null }): Threshold {
  return {
    id: t.id,
    deviceId: t.device_id ?? t.device,
    parameterKey: t.parameter_key,
    min: t.min ?? undefined,
    max: t.max ?? undefined,
  };
}

export const thresholdService = {
  getThresholds: async (deviceId?: string): Promise<Threshold[]> => {
    const params = deviceId ? `?device_id=${deviceId}` : '';
    const response = await apiClient.get<Threshold[] | { results: unknown[] }>(`/thresholds/${params}`);
    if (response.error || response.data === undefined) {
      if (response.error?.includes('Authentication') || response.error?.includes('credentials')) return [];
      throw new Error(response.error || 'Failed to fetch thresholds');
    }
    const list = Array.isArray(response.data) ? response.data : (response.data as { results: unknown[] }).results;
    return (list as { id?: number; device: number; device_id?: number; parameter_key: string; min?: number | null; max?: number | null }[]).map(mapThresholdFromApi);
  },

  setThreshold: async (threshold: Threshold): Promise<void> => {
    const body = {
      device: typeof threshold.deviceId === 'number' ? threshold.deviceId : parseInt(threshold.deviceId, 10),
      parameter_key: threshold.parameterKey,
      min: threshold.min ?? null,
      max: threshold.max ?? null,
    };
    if (threshold.id != null) {
      const response = await apiClient.put<unknown>(`/thresholds/${threshold.id}/`, body);
      if (response.error) throw new Error(response.error || 'Failed to update threshold');
    } else {
      const response = await apiClient.post<unknown>('/thresholds/', body);
      if (response.error) throw new Error(response.error || 'Failed to create threshold');
    }
  },

  deleteThreshold: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`/thresholds/${id}/`);
    if (response.error) throw new Error(response.error || 'Failed to delete threshold');
  },
};

// Alarm Service (Module 5 - backend API). Alarms are created server-side on data ingest.
function mapAlarmFromApi(a: { id: number; device: number; device_id?: number; device_name?: string; parameter_key: string; parameter_label: string; value: number; threshold: number; type: string; timestamp: string; acknowledged: boolean }): Alarm {
  return {
    id: String(a.id),
    deviceId: a.device_id ?? a.device,
    deviceName: a.device_name ?? '',
    parameterKey: a.parameter_key,
    parameterLabel: a.parameter_label,
    value: a.value,
    threshold: a.threshold,
    type: a.type as 'min' | 'max',
    timestamp: a.timestamp,
    acknowledged: a.acknowledged,
  };
}

export const alarmService = {
  getAlarms: async (acknowledged?: boolean): Promise<Alarm[]> => {
    const params = acknowledged !== undefined ? `?acknowledged=${acknowledged}` : '';
    const response = await apiClient.get<unknown[]>(`/alarms/${params}`);
    if (response.error || response.data === undefined) {
      if (response.error?.includes('Authentication') || response.error?.includes('credentials')) return [];
      throw new Error(response.error || 'Failed to fetch alarms');
    }
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map((a: { id: number; device: number; device_id?: number; device_name?: string; parameter_key: string; parameter_label: string; value: number; threshold: number; type: string; timestamp: string; acknowledged: boolean }) => mapAlarmFromApi(a));
  },

  acknowledgeAlarm: async (alarmId: string): Promise<void> => {
    const response = await apiClient.patch<unknown>(`/alarms/${alarmId}/`, { acknowledged: true });
    if (response.error) throw new Error(response.error || 'Failed to acknowledge alarm');
  },
};

// Historical Data Service (backend device-data list)
export const historyService = {
  getHistoricalData: async (deviceId: string, from: Date, to: Date): Promise<{ timestamp: string; deviceId: string; parameters: Record<string, number> }[]> => {
    const deviceIdNum = parseInt(deviceId, 10);
    if (Number.isNaN(deviceIdNum)) return [];

    const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
    const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    const params = new URLSearchParams({
      device_id: String(deviceIdNum),
      from_date: fromDate.toISOString(),
      to_date: toDate.toISOString(),
      page_size: '5000'
    });

    const response = await apiClient.get<{ count: number; next: string | null; results: { id: number; device: number; parameters: Record<string, number>; timestamp: string }[] }>(
      `/device-data/list/?${params.toString()}`
    );
    if (response.error || !response.data?.results) return [];

    return response.data.results.map(r => ({
      timestamp: r.timestamp,
      deviceId,
      parameters: r.parameters || {}
    }));
  }
};

// Module 6: Grouping and aggregation response types
export interface GroupingFloor {
  name: string;
  device_ids: number[];
  device_count: number;
  total_kw: number;
}

export interface GroupingBuilding {
  name: string;
  floors: GroupingFloor[];
}

export interface GroupingArea {
  name: string;
  buildings: GroupingBuilding[];
}

export interface GroupingResponse {
  areas: GroupingArea[];
}

export const groupingService = {
  getGrouping: async (aggregation: 'sum' | 'avg' = 'sum'): Promise<GroupingResponse> => {
    const query = aggregation ? `?aggregation=${aggregation}` : '';
    const response = await apiClient.get<GroupingResponse>(`/grouping/${query}`);
    if (response.error || response.data === undefined) {
      if (response.error?.includes('Authentication') || response.error?.includes('credentials')) {
        return { areas: [] };
      }
      throw new Error(response.error || 'Failed to fetch grouping');
    }
    return response.data;
  },
};

// Branding Service - Backend API (Module 8)
export interface BrandingResponse {
  title: string;
  logo_url: string;
}

export const brandingService = {
  getBranding: async (): Promise<{ logo: string; title: string }> => {
    const response = await apiClient.get<BrandingResponse>('/branding/');
    if (response.error || !response.data) {
      return { ...FALLBACK_BRANDING };
    }
    return {
      title: response.data.title || FALLBACK_BRANDING.title,
      logo: response.data.logo_url || '',
    };
  },

  updateBranding: async (payload: { title?: string; logo?: File }): Promise<{ logo: string; title: string }> => {
    const formData = new FormData();
    if (payload.title !== undefined) formData.append('title', payload.title);
    if (payload.logo instanceof File) formData.append('logo', payload.logo);
    const response = await apiClient.patchForm<BrandingResponse>('/branding/', formData);
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to save branding');
    }
    return {
      title: response.data.title || FALLBACK_BRANDING.title,
      logo: response.data.logo_url || '',
    };
  },
};

// User Service - Django DRF Integration
export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<{
      count: number;
      results: User[];
    }>('/auth/users/');
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch users');
    }
    
    return response.data.results.map(user =>
      normalizeUser({
        ...user,
        name: user.first_name && user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.first_name || user.last_name || user.username,
      })
    );
  },
  
  getUserById: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/auth/users/${id}/`);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to fetch user');
    }
    
    const user = response.data;
    return normalizeUser({
      ...user,
      name: user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name || user.username,
    });
  },

  createUser: async (userData: {
    username: string;
    email?: string;
    mobile?: string;
    password: string;
    password_confirm: string;
    role: 'admin' | 'user';
    first_name?: string;
    last_name?: string;
  }): Promise<User> => {
    const response = await apiClient.post<{
      message: string;
      user: User;
      tokens?: {
        access: string;
        refresh: string;
      };
    }>('/auth/register/', userData);
    
    if (response.error || !response.data) {
      const err = new Error(response.error || 'Failed to create user') as Error & { details?: Record<string, string[]> };
      err.details = response.details;
      throw err;
    }
    
    const user = response.data.user;
    return normalizeUser({
      ...user,
      name: user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name || user.username,
    });
  },

  updateUser: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>(`/auth/users/${id}/`, userData);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update user');
    }
    
    const user = response.data;
    return normalizeUser({
      ...user,
      name: user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name || user.username,
    });
  },

  updateCurrentUser: async (userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>('/auth/users/me/', userData);
    
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to update user');
    }
    
    const user = response.data;
    const displayUser = normalizeUser({
      ...user,
      name: user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.first_name || user.last_name || user.username,
    });
    // User source of truth is DB; we do not cache in localStorage
    return displayUser;
  },
  
  deleteUser: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`/auth/users/${id}/`);
    
    if (response.error) {
      throw new Error(response.error || 'Failed to delete user');
    }
  }
};

