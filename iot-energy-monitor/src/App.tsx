import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DeviceRegistration from './pages/DeviceRegistration';
import DeviceDetail from './pages/DeviceDetail';
import RegisterDevice from './pages/RegisterDevice';
import MQTTRegisterDevice from './pages/MQTTRegisterDevice';
import ParameterMapping from './pages/ParameterMapping';
import ThresholdSettings from './pages/ThresholdSettings';
import AlarmManagement from './pages/AlarmManagement';
import UserManagement from './pages/UserManagement';
import CreateUser from './pages/CreateUser';
import GroupedDashboards from './pages/GroupedDashboards';
import Reports from './pages/Reports';
import WhiteLabeling from './pages/WhiteLabeling';
import Help from './pages/Help';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles
}) => {
  const token = localStorage.getItem('access_token');
  const { user, isLoadingUser } = useApp();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AppProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <DeviceRegistration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices/:id"
            element={
              <ProtectedRoute>
                <DeviceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices/register"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <RegisterDevice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices/register-mqtt"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <MQTTRegisterDevice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parameter-mapping"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <ParameterMapping />
              </ProtectedRoute>
            }
          />
          <Route
            path="/thresholds"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <ThresholdSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alarms"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <AlarmManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users/create"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <CreateUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/grouping"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <GroupedDashboards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/white-labeling"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <WhiteLabeling />
              </ProtectedRoute>
            }
          />
          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <Help />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
