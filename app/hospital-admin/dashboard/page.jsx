'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  Users, 
  UserPlus,
  LogOut,
  Search,
  X,
  AlertCircle,
  Shield,
  Activity
} from 'lucide-react';

function DashboardContent() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    roleNames: [],
  });

  const availableRoles = ['DOCTOR', 'NURSE', 'PHARMACIST', 'RECEPTIONIST'];

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/hospital?action=users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const filteredUsers = data.data.filter(
          (user) => !user.roles.some((role) => role.name === 'HOSPITAL_ADMIN')
        );
        setUsers(filteredUsers);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      await fetch('/api/auth?action=logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      window.location.href = '/auth/login';
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setError('');
    setSuccess('');

    if (formData.roleNames.length === 0) {
      setError('Please select at least one role');
      setAddLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/hospital?action=create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create user');
      }

      setSuccess(`User created successfully! Username: ${data.data.username}`);
      fetchUsers();
      
      setTimeout(() => {
        setShowAddModal(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          department: '',
          roleNames: [],
        });
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleForcePasswordChange = async (userId) => {
    if (!confirm('Force this user to change password on next login?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/hospital?action=force-password-change&id=${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to force password change');
      }

      alert('Password change forced. User sessions cleared.');
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to force password change');
    }
  };

  const toggleRole = (role) => {
    setFormData((prev) => ({
      ...prev,
      roleNames: prev.roleNames.includes(role)
        ? prev.roleNames.filter((r) => r !== role)
        : [...prev.roleNames, role],
    }));
  };

  const filteredUsers = users.filter(
    (u) =>
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Hospital Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
              <p className="text-gray-700 mt-2 font-medium">Manage hospital staff and users</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md border-2 border-blue-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">Total Users</p>
                    <p className="text-4xl font-bold text-blue-900">{users.length}</p>
                  </div>
                  <div className="bg-blue-600 p-4 rounded-xl shadow-md">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md border-2 border-green-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">Active Users</p>
                    <p className="text-4xl font-bold text-green-900">
                      {users.filter((u) => u.status === 'ACTIVE').length}
                    </p>
                  </div>
                  <div className="bg-green-600 p-4 rounded-xl shadow-md">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md border-2 border-orange-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-800 mb-1">Password Reset Pending</p>
                    <p className="text-4xl font-bold text-orange-900">
                      {users.filter((u) => u.mustChangePassword).length}
                    </p>
                  </div>
                  <div className="bg-orange-600 p-4 rounded-xl shadow-md">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900">Staff Members</h3>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Add User</span>
                </button>
              </div>

              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or username..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Email</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Roles</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Department</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">{u.email}</td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">
                          {u.roles.map((r) => r.name).join(', ')}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">{u.department || '-'}</td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                                u.status === 'ACTIVE'
                                  ? 'bg-green-200 text-green-900'
                                  : 'bg-red-200 text-red-900'
                              }`}
                            >
                              {u.status}
                            </span>
                            {u.mustChangePassword && (
                              <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-orange-200 text-orange-900">
                                Password Reset
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <button
                            onClick={() => handleForcePasswordChange(u.id)}
                            className="text-blue-700 font-bold hover:text-blue-900 hover:underline transition-colors"
                          >
                            Force Password Change
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New User</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            {error && (
              <div className="mb-4 text-sm font-semibold text-red-800 bg-red-100 border-2 border-red-300 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 text-sm font-semibold text-green-800 bg-green-100 border-2 border-green-300 rounded-lg px-4 py-3">
                {success}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    First Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Last Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="john.doe@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g. Cardiology"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3">
                  Roles <span className="text-red-600">*</span>
                </label>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  {availableRoles.map((role) => (
                    <label key={role} className="flex items-center space-x-3 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.roleNames.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="w-5 h-5 text-blue-600 border-2 border-gray-400 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-900">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {addLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HospitalAdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
