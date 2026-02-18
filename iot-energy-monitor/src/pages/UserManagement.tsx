import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { userService, deviceService, User } from '../lib/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Users, Mail, Phone, Shield, Zap, UserPlus, Edit, Trash2, RefreshCw, User as UserIcon, Search, LayoutList, LayoutGrid } from 'lucide-react';

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { devices, user: currentUser } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    let result = users;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (u) =>
          (u.name?.toLowerCase().includes(q)) ||
          (u.username?.toLowerCase().includes(q)) ||
          (u.email?.toLowerCase().includes(q)) ||
          (u.mobile?.includes(q))
      );
    }
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, searchQuery, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await userService.getAllUsers();
      // Filter out super_admin from list (only show admin and user)
      setUsers(allUsers.filter(u => u.role !== 'super_admin'));
    } catch (error: any) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDevices = async () => {
    if (!selectedUser) return;
    try {
      // Update each device with assigned users
      for (const deviceIdStr of selectedDevices) {
        const deviceId = parseInt(deviceIdStr, 10);
        if (!isNaN(deviceId)) {
          const device = devices.find(d => d.id === deviceId);
          if (device) {
            const currentUserIds = device.assigned_user_ids || [];
            if (!currentUserIds.includes(selectedUser.id)) {
              await deviceService.updateDevice(deviceId, {
                assigned_user_ids: [...currentUserIds, selectedUser.id],
              });
            }
          }
        }
      }
      
      // Also unassign devices that were deselected
      const allDeviceIds = devices.map(d => d.id.toString());
      for (const deviceIdStr of allDeviceIds) {
        if (!selectedDevices.includes(deviceIdStr)) {
          const deviceId = parseInt(deviceIdStr, 10);
          if (!isNaN(deviceId)) {
            const device = devices.find(d => d.id === deviceId);
            if (device) {
              const currentUserIds = device.assigned_user_ids || [];
              const updatedUserIds = currentUserIds.filter(id => id !== selectedUser.id);
              await deviceService.updateDevice(deviceId, {
                assigned_user_ids: updatedUserIds,
              });
            }
          }
        }
      }
      
      await loadUsers();
      setAssignOpen(false);
      setSelectedUser(null);
      setSelectedDevices([]);
    } catch (error: any) {
      alert(error.message || 'Failed to assign devices');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Only Super Admin can delete users
    if (currentUser?.role !== 'super_admin') {
      alert('Only Super Admin can delete users');
      return;
    }

    try {
      await userService.deleteUser(userToDelete.id);
      await loadUsers();
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      alert(error.message || 'Failed to delete user');
    }
  };

  const handleEditUser = (user: User) => {
    // Navigate to edit page (we can create this later)
    // For now, just show an alert
    alert('Edit user functionality coming soon!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">User Management</h1>
            <p className="text-slate-600">
              Manage users and assign devices to control access
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={loadUsers}
              disabled={loading}
              className="border-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => navigate('/users/create')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <Card className="border border-slate-200">
          <CardContent className="p-12 text-center">
            <RefreshCw className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600 text-lg font-medium">Loading users...</p>
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium mb-2">No users found</p>
            <p className="text-slate-500 text-sm mb-4">Create users to manage device access</p>
            <Button 
              onClick={() => navigate('/users/create')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create First User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search, filter, and view toggle */}
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, username, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-slate-300"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
                  className="h-10 px-4 rounded-md border border-slate-300 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    title="List view"
                  >
                    <LayoutList className="h-4 w-4" />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Grid
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {filteredUsers.length === 0 ? (
            <Card className="border border-slate-200">
              <CardContent className="p-12 text-center">
                <Search className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 text-lg font-medium mb-2">No users match your search or filter</p>
                <p className="text-slate-500 text-sm">Try adjusting the search or role filter</p>
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            /* List view (default) */
            <Card className="border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Phone</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Devices</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.name || user.username}</p>
                              {user.username && (
                                <p className="text-xs text-slate-500">@{user.username}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                            <Shield className="h-3 w-3" />
                            {user.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{user.email || '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{user.mobile || '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{user.assignedDevices?.length ?? 0}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              className="border-slate-300 text-sm py-1.5"
                              onClick={() => {
                                setSelectedUser(user);
                                setSelectedDevices(user.assignedDevices || []);
                                setAssignOpen(true);
                              }}
                            >
                              <Zap className="h-4 w-4 mr-1" />
                              Assign
                            </Button>
                            {currentUser?.role === 'super_admin' && (
                              <>
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors"
                                  title="Edit user"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setDeleteConfirmOpen(true);
                                  }}
                                  className="p-2 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Users ({filteredUsers.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="hover:shadow-lg transition-shadow border border-slate-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-lg">
                          {user.name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{user.name || user.username}</CardTitle>
                        <div className="flex items-center space-x-1 mt-1">
                          <Shield className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500 capitalize">{user.role?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    {currentUser?.role === 'super_admin' && (
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-blue-600 transition-colors"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-red-600 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm mb-4">
                    {user.email && (
                      <div className="flex items-center space-x-2 text-slate-600">
                        <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    )}
                    {user.mobile && (
                      <div className="flex items-center space-x-2 text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span>{user.mobile}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Zap className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span><strong>Devices:</strong> {user.assignedDevices?.length || 0}</span>
                    </div>
                    {user.username && (
                      <div className="flex items-center space-x-2 text-slate-500 text-xs">
                        <UserIcon className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">@{user.username}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full border-slate-300 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedDevices(user.assignedDevices || []);
                        setAssignOpen(true);
                      }}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Assign Devices
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader onClose={() => setDeleteConfirmOpen(false)}>
            <DialogTitle className="text-2xl font-bold text-red-600">Delete User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-700">
              Are you sure you want to delete <strong>{userToDelete?.name || userToDelete?.username}</strong>?
            </p>
            <p className="text-sm text-slate-500">
              This action cannot be undone. All user data and device assignments will be removed.
            </p>
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setUserToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Devices Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader onClose={() => setAssignOpen(false)}>
            <DialogTitle className="text-2xl font-bold">Assign Devices to {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {devices.map((device) => {
              const deviceId = typeof device.id === 'number' ? device.id.toString() : device.id;
              return (
                <label 
                  key={device.id} 
                  className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedDevices.includes(deviceId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDevices([...selectedDevices, deviceId]);
                      } else {
                        setSelectedDevices(selectedDevices.filter(id => id !== deviceId));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <Zap className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <span className="font-medium text-slate-900">{device.name}</span>
                    <span className="text-sm text-slate-500 ml-2">({device.hardwareAddress || device.hardware_address})</span>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignDevices}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Assign Devices
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
