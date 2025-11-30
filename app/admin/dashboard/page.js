'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Users,
  Building2,
  Activity,
  TrendingUp,
  LogOut,
  Search,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Mail,
  Globe,
  FileText,
  Shield,
  RefreshCw,
} from 'lucide-react';

function DashboardContent() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedHospital, setSelectedHospital] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [panelInfo, setPanelInfo] = useState('');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin?action=dashboard-stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
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

  const openHospitalDetails = async (hospitalId) => {
    setDetailLoading(true);
    setPanelError('');
    setPanelInfo('');
    setSelectedHospital(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/admin?action=hospital&id=${hospitalId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch hospital details');
      }

      const hospital = data.data;
      const primaryAdmin = hospital.users?.find((u) => u.status === 'ACTIVE') || hospital.users?.[0];

      setSelectedHospital({
        ...hospital,
        primaryAdmin,
      });
    } catch (err) {
      setPanelError(err.message || 'Failed to load hospital details');
    } finally {
      setDetailLoading(false);
    }
  };

  const updateHospitalStatus = (newStatus) => {
    setSelectedHospital((prev) => prev ? { ...prev, status: newStatus } : prev);
    setStats((prev) => {
      if (!prev) return prev;
      const updatedRecent = prev.recentHospitals?.map((h) =>
        h.id === selectedHospital.id ? { ...h, status: newStatus } : h
      );
      return { ...prev, recentHospitals: updatedRecent };
    });
    fetchDashboardStats(); // Refresh stats
  };

  const handleVerifyHospital = async () => {
    if (!selectedHospital) return;

    setActionLoading(true);
    setPanelError('');
    setPanelInfo('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/admin?action=hospital-approve&id=${selectedHospital.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to approve hospital');
      }

      setPanelInfo('Hospital verified and activated successfully!');
      updateHospitalStatus('ACTIVE');
    } catch (err) {
      setPanelError(err.message || 'Failed to approve hospital');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendHospital = async () => {
    if (!selectedHospital) return;

    setActionLoading(true);
    setPanelError('');
    setPanelInfo('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/admin?action=hospital-suspend&id=${selectedHospital.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to suspend hospital');
      }

      setPanelInfo('Hospital suspended successfully.');
      updateHospitalStatus('SUSPENDED');
    } catch (err) {
      setPanelError(err.message || 'Failed to suspend hospital');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInactivateHospital = async () => {
    if (!selectedHospital) return;

    setActionLoading(true);
    setPanelError('');
    setPanelInfo('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/admin?action=hospital-inactivate&id=${selectedHospital.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to inactivate hospital');
      }

      setPanelInfo('Hospital inactivated successfully.');
      updateHospitalStatus('INACTIVE');
    } catch (err) {
      setPanelError(err.message || 'Failed to inactivate hospital');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateHospital = async () => {
    if (!selectedHospital) return;

    setActionLoading(true);
    setPanelError('');
    setPanelInfo('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/admin?action=hospital-reactivate&id=${selectedHospital.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reactivate hospital');
      }

      setPanelInfo('Hospital reactivated successfully.');
      updateHospitalStatus('ACTIVE');
    } catch (err) {
      setPanelError(err.message || 'Failed to reactivate hospital');
    } finally {
      setActionLoading(false);
    }
  };

  const closePanel = () => {
    setSelectedHospital(null);
    setPanelError('');
    setPanelInfo('');
  };

  const filteredHospitals = stats?.recentHospitals?.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.email.toLowerCase().includes(search.toLowerCase()) ||
      h.licenseNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? h.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-indigo-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-gray-700 mt-2 font-medium">
                Platform overview and hospital management
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md border-2 border-blue-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">Total Hospitals</p>
                    <p className="text-4xl font-bold text-blue-900">
                      {stats?.overview?.totalHospitals || 0}
                    </p>
                    <p className="text-xs text-blue-700 font-medium mt-1">
                      +{stats?.overview?.newHospitalsThisMonth || 0} this month
                    </p>
                  </div>
                  <div className="bg-blue-600 p-4 rounded-xl shadow-md">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md border-2 border-green-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">Active Hospitals</p>
                    <p className="text-4xl font-bold text-green-900">
                      {stats?.overview?.activeHospitals || 0}
                    </p>
                    <p className="text-xs text-green-700 font-medium mt-1">Currently operational</p>
                  </div>
                  <div className="bg-green-600 p-4 rounded-xl shadow-md">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md border-2 border-purple-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-800 mb-1">Total Users</p>
                    <p className="text-4xl font-bold text-purple-900">
                      {stats?.platform?.totalUsers || 0}
                    </p>
                    <p className="text-xs text-purple-700 font-medium mt-1">Across all hospitals</p>
                  </div>
                  <div className="bg-purple-600 p-4 rounded-xl shadow-md">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md border-2 border-orange-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-800 mb-1">Pending Approvals</p>
                    <p className="text-4xl font-bold text-orange-900">
                      {stats?.overview?.pendingApprovals || 0}
                    </p>
                    <p className="text-xs text-orange-700 font-medium mt-1">Requires attention</p>
                  </div>
                  <div className="bg-orange-600 p-4 rounded-xl shadow-md">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Hospitals Table */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900">Hospital Management</h3>
                <button
                  onClick={fetchDashboardStats}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or license..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  <option value="">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Hospital Name</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Email</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">License No.</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Registered</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHospitals.map((hospital) => (
                      <tr
                        key={hospital.id}
                        className="border-b border-gray-200 hover:bg-indigo-50 transition-colors"
                      >
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900">{hospital.name}</td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">{hospital.email}</td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">{hospital.licenseNumber}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${hospital.status === 'ACTIVE'
                                ? 'bg-green-200 text-green-900'
                                : hospital.status === 'PENDING'
                                  ? 'bg-yellow-200 text-yellow-900'
                                  : hospital.status === 'VERIFIED'
                                    ? 'bg-blue-200 text-blue-900'
                                    : hospital.status === 'SUSPENDED'
                                      ? 'bg-orange-200 text-orange-900'
                                      : hospital.status === 'INACTIVE'
                                        ? 'bg-red-200 text-red-900'
                                        : 'bg-gray-200 text-gray-900'
                              }`}
                          >
                            {hospital.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">
                          {new Date(hospital.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            className="text-indigo-700 font-bold hover:text-indigo-900 hover:underline transition-colors"
                            onClick={() => openHospitalDetails(hospital.id)}
                          >
                            Review
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

      {/* Hospital Details Slide Panel */}
      {selectedHospital && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Hospital Management</h2>
                <button
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  onClick={closePanel}
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {panelError && (
                    <div className="mb-4 text-sm font-semibold text-red-800 bg-red-100 border-2 border-red-300 rounded-lg px-4 py-3">
                      {panelError}
                    </div>
                  )}
                  {panelInfo && (
                    <div className="mb-4 text-sm font-semibold text-green-800 bg-green-100 border-2 border-green-300 rounded-lg px-4 py-3">
                      {panelInfo}
                    </div>
                  )}

                  {/* Hospital Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200 mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                      <Building2 className="w-5 h-5 mr-2" />
                      Hospital Information
                    </h3>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Tenant ID:</p>
                      <p className="text-sm text-gray-700 font-medium flex items-center">
                        <Shield className="w-4 h-4 mr-1" />
                        {selectedHospital.tenantId}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Name:</p>
                        <p className="text-sm text-gray-700 font-medium">{selectedHospital.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Email:</p>
                        <p className="text-sm text-gray-700 font-medium flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          {selectedHospital.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Domain/Website:</p>
                        <p className="text-sm text-gray-700 font-medium flex items-center">
                          <Globe className="w-4 h-4 mr-1" />
                          {selectedHospital.domain}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">License Number:</p>
                        <p className="text-sm text-gray-700 font-medium flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {selectedHospital.licenseNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Address:</p>
                        <p className="text-sm text-gray-700 font-medium">
                          {selectedHospital.address}
                          {selectedHospital.city && `, ${selectedHospital.city}`}
                          {selectedHospital.state && `, ${selectedHospital.state}`}
                          {selectedHospital.pincode && ` - ${selectedHospital.pincode}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Registered On:</p>
                        <p className="text-sm text-gray-700 font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(selectedHospital.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Current Status:</p>
                        <span
                          className={`inline-block px-3 py-1 text-xs font-bold rounded-full mt-1 ${selectedHospital.status === 'ACTIVE'
                              ? 'bg-green-200 text-green-900'
                              : selectedHospital.status === 'PENDING'
                                ? 'bg-yellow-200 text-yellow-900'
                                : selectedHospital.status === 'VERIFIED'
                                  ? 'bg-blue-200 text-blue-900'
                                  : selectedHospital.status === 'SUSPENDED'
                                    ? 'bg-orange-200 text-orange-900'
                                    : selectedHospital.status === 'INACTIVE'
                                      ? 'bg-red-200 text-red-900'
                                      : 'bg-gray-200 text-gray-900'
                            }`}
                        >
                          {selectedHospital.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Details */}
                  {selectedHospital.primaryAdmin && (
                    <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200 mb-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Primary Admin
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-bold text-gray-900">Name:</p>
                          <p className="text-sm text-gray-700 font-medium">
                            {selectedHospital.primaryAdmin.firstName}{' '}
                            {selectedHospital.primaryAdmin.lastName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Email:</p>
                          <p className="text-sm text-gray-700 font-medium">
                            {selectedHospital.primaryAdmin.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">Username:</p>
                          <p className="text-sm text-gray-700 font-medium">
                            {selectedHospital.primaryAdmin.username}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>

                    {selectedHospital.status === 'PENDING' && (
                      <div className="flex gap-3">
                        <button
                          className="flex-1 px-4 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-green-600 to-teal-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                          disabled={actionLoading}
                          onClick={handleVerifyHospital}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {actionLoading ? 'Verifying...' : 'Verify & Activate'}
                        </button>
                      </div>
                    )}

                    {selectedHospital.status === 'ACTIVE' && (
                      <div className="space-y-3">
                        <button
                          className="w-full px-4 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-orange-600 to-red-500 hover:shadow-lg hover:scale-105 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                          disabled={actionLoading}
                          onClick={handleSuspendHospital}
                        >
                          <AlertCircle className="w-4 h-4" />
                          {actionLoading ? 'Suspending...' : 'Suspend Hospital'}
                        </button>
                        <button
                          className="w-full px-4 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:scale-105 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                          disabled={actionLoading}
                          onClick={handleInactivateHospital}
                        >
                          <XCircle className="w-4 h-4" />
                          {actionLoading ? 'Inactivating...' : 'Inactivate Hospital'}
                        </button>
                      </div>
                    )}

                    {(selectedHospital.status === 'SUSPENDED' || selectedHospital.status === 'INACTIVE') && (
                      <button
                        className="w-full px-4 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-green-600 to-teal-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                        disabled={actionLoading}
                        onClick={handleReactivateHospital}
                      >
                        <CheckCircle className="w-4 h-4" />
                        {actionLoading ? 'Reactivating...' : 'Reactivate Hospital'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
