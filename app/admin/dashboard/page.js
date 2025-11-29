'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  Users, 
  Building2, 
  Activity, 
  TrendingUp,
  LogOut,
  Menu,
  Search
} from 'lucide-react';

function DashboardContent() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

      setPanelInfo('Hospital verified and activated.');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button className="lg:hidden">
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Super Admin Dashboard</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-gray-600 mt-1">
                Here's what's happening with your platform today.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Hospitals</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats?.overview?.totalHospitals || 0}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      +{stats?.overview?.newHospitalsThisMonth || 0} this month
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Hospitals</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats?.overview?.activeHospitals || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Currently operational</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats?.platform?.totalUsers || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Across all hospitals</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Approvals</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stats?.overview?.pendingApprovals || 0}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">Requires attention</p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Hospitals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Hospitals</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Registered</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentHospitals?.map((hospital) => (
                      <tr
                        key={hospital.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-sm text-gray-900">{hospital.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{hospital.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              hospital.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-700'
                                : hospital.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : hospital.status === 'SUSPENDED'
                                ? 'bg-orange-100 text-orange-700'
                                : hospital.status === 'INACTIVE'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {hospital.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(hospital.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          <button
                            className="text-blue-600 font-semibold hover:underline"
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

      {/* Right side details panel */}
      {selectedHospital && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <div className="w-full max-w-md h-full bg-white shadow-xl p-6 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Hospital Management</h2>
              <button
                className="text-sm text-gray-500 hover:text-gray-800"
                onClick={closePanel}
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {panelError && (
                  <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {panelError}
                  </div>
                )}
                {panelInfo && (
                  <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                    {panelInfo}
                  </div>
                )}

                <div className="space-y-2 text-sm text-gray-800 mb-4">
                  <p>
                    <span className="font-semibold">Hospital:</span>{' '}
                    {selectedHospital.name}
                  </p>
                  <p>
                    <span className="font-semibold">Email:</span>{' '}
                    {selectedHospital.email}
                  </p>
                  <p>
                    <span className="font-semibold">Website / Domain:</span>{' '}
                    {selectedHospital.domain}
                  </p>
                  <p>
                    <span className="font-semibold">License No.:</span>{' '}
                    {selectedHospital.licenseNumber}
                  </p>
                  <p>
                    <span className="font-semibold">Registered on:</span>{' '}
                    {new Date(selectedHospital.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{' '}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedHospital.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : selectedHospital.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : selectedHospital.status === 'SUSPENDED'
                          ? 'bg-orange-100 text-orange-700'
                          : selectedHospital.status === 'INACTIVE'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selectedHospital.status}
                    </span>
                  </p>
                </div>

                {selectedHospital.primaryAdmin && (
                  <div className="mb-4 border-t border-gray-200 pt-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      Admin Details
                    </h3>
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">Name:</span>{' '}
                      {selectedHospital.primaryAdmin.firstName}{' '}
                      {selectedHospital.primaryAdmin.lastName}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold">Email:</span>{' '}
                      {selectedHospital.primaryAdmin.email}
                    </p>
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-gray-200">
                  {selectedHospital.status === 'PENDING' && (
                    <div className="flex justify-end gap-3">
                      <button
                        className="px-4 py-2 text-sm font-semibold border rounded-lg hover:bg-gray-50"
                        onClick={closePanel}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                        disabled={actionLoading}
                        onClick={handleVerifyHospital}
                      >
                        {actionLoading ? 'Verifying...' : 'Verify & Activate'}
                      </button>
                    </div>
                  )}

                  {selectedHospital.status === 'ACTIVE' && (
                    <div className="flex justify-end gap-2">
                      <button
                        className="px-4 py-2 text-sm font-semibold border rounded-lg hover:bg-gray-50"
                        onClick={closePanel}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60"
                        disabled={actionLoading}
                        onClick={handleSuspendHospital}
                      >
                        {actionLoading ? 'Suspending...' : 'Suspend'}
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                        disabled={actionLoading}
                        onClick={handleInactivateHospital}
                      >
                        {actionLoading ? 'Inactivating...' : 'Inactivate'}
                      </button>
                    </div>
                  )}

                  {(selectedHospital.status === 'SUSPENDED' || selectedHospital.status === 'INACTIVE') && (
                    <div className="flex justify-end gap-3">
                      <button
                        className="px-4 py-2 text-sm font-semibold border rounded-lg hover:bg-gray-50"
                        onClick={closePanel}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                        disabled={actionLoading}
                        onClick={handleReactivateHospital}
                      >
                        {actionLoading ? 'Reactivating...' : 'Reactivate'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
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
