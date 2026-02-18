import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Device, User, ParameterMapping, Alarm, Threshold } from '../lib/api';
import { deviceService, parameterService, thresholdService, alarmService, authService } from '../lib/api';

interface AppContextType {
  devices: Device[];
  user: User | null;
  isLoadingUser: boolean;
  parameterMapping: ParameterMapping;
  thresholds: Threshold[];
  alarms: Alarm[];
  updateDevice: (device: Device) => void;
  updateDevices: (devices: Device[]) => void;
  setUser: (user: User | null) => void;
  setParameterMapping: (mapping: ParameterMapping) => void;
  setThresholds: (thresholds: Threshold[]) => void;
  acknowledgeAlarm: (alarmId: string) => void;
  refreshDevices: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [parameterMapping, setParameterMapping] = useState<ParameterMapping>({});
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);

  const refreshDevices = async () => {
    // Check if user is authenticated before making API calls
    const token = localStorage.getItem('access_token');
    if (!token) {
      // Not authenticated, skip API calls
      return;
    }
    
    try {
      // Load devices and latest live data in parallel (Module 3)
      const [allDevices, latestData] = await Promise.all([
        deviceService.getAllDevices(),
        deviceService.getLatestDeviceData().catch(
          (): Record<string, { parameters: Record<string, number>; timestamp: string }> => ({})
        ),
      ]);
      const mergedDevices = allDevices.map(device => {
        const latest = latestData[String(device.id)];
        return {
          ...device,
          parameters: latest?.parameters ?? {},
          lastUpdate: latest?.timestamp ?? device.last_data_received ?? device.lastUpdate,
        };
      });
      setDevices(mergedDevices);
      
      // Load parameter mappings
      const mapping = await parameterService.getMapping();
      setParameterMapping(mapping);
      
      // Module 5: Thresholds and alarms from backend (alarms created server-side on data ingest)
      const allThresholds = await thresholdService.getThresholds();
      setThresholds(allThresholds);
      const allAlarms = await alarmService.getAlarms();
      setAlarms(allAlarms);
    } catch (error: any) {
      // Don't log authentication errors - they're expected when not logged in
      if (error?.message && !error.message.includes('Authentication') && !error.message.includes('credentials')) {
        console.error('Failed to refresh devices:', error);
      }
      // Don't throw - allow app to continue with existing data
    }
  };

  const updateDevice = (device: Device) => {
    setDevices(prev => {
      const index = prev.findIndex(d => d.id === device.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = device;
        return updated;
      }
      return [...prev, device];
    });
  };

  const updateDevices = (newDevices: Device[]) => {
    setDevices(newDevices);
  };

  const acknowledgeAlarm = async (alarmId: string) => {
    await alarmService.acknowledgeAlarm(alarmId);
    const allAlarms = await alarmService.getAlarms();
    setAlarms(allAlarms);
  };

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsLoadingUser(false);
            await loadAuthenticatedData();
          } else {
            setUser(null);
            setIsLoadingUser(false);
          }
        } catch (error) {
          authService.logout();
          setUser(null);
          setIsLoadingUser(false);
        }
      } else {
        setUser(null);
        setIsLoadingUser(false);
        try {
          const allThresholds = await thresholdService.getThresholds();
          setThresholds(allThresholds);
        } catch (_e) {
          // No token: thresholds may fail; ignore
        }
      }
    };
    
    const loadAuthenticatedData = async () => {
      // Load parameter mappings from API
      try {
        const mapping = await parameterService.getMapping();
        setParameterMapping(mapping);
      } catch (error: any) {
        // Only log if it's not an authentication error
        if (error?.message && !error.message.includes('Authentication')) {
          console.error('Failed to load parameter mappings:', error);
        }
        // Use empty mapping as fallback
        setParameterMapping({});
      }
      
      // Load thresholds from API (Module 5)
      const allThresholds = await thresholdService.getThresholds();
      setThresholds(allThresholds);
      
      // Load devices from API
      try {
        await refreshDevices();
      } catch (error: any) {
        // Log error if it's not an authentication error
        if (error?.message && !error.message.includes('Authentication')) {
          console.error('Failed to load devices from API:', error);
        }
      }
    };
    
    init();

    // Poll for device updates from backend every 2 seconds (only if authenticated)
    const interval = setInterval(async () => {
      const currentToken = localStorage.getItem('access_token');
      if (!currentToken) return;

      try {
        await refreshDevices();
      } catch (error: any) {
        if (error?.message && !error.message.includes('Authentication')) {
          console.debug('Polling error (non-critical):', error);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider
      value={{
        devices,
        user,
        isLoadingUser,
        parameterMapping,
        thresholds,
        alarms,
        updateDevice,
        updateDevices,
        setUser,
        setParameterMapping,
        setThresholds,
        acknowledgeAlarm,
        refreshDevices
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
