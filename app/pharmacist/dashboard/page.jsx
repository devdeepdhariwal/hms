'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Package,
  FileText,
  CheckCircle,
  Clock,
  LogOut,
  Search,
  X,
  Eye,
  EyeOff,
  Lock,
  Calendar,
  User,
  Phone,
  Pill,
} from 'lucide-react';

function DashboardContent() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [dispensing, setDispensing] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    if (userData?.mustChangePassword) {
      setShowPasswordModal(true);
    }
    
    fetchStats();
    fetchPrescriptions();
  }, [statusFilter]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/pharmacist?action=dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/pharmacist?action=prescriptions&status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPrescriptions(data.data);
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/pharmacist?action=reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to change password');
      }

      alert('Password changed successfully! Please login again.');
      localStorage.clear();
      window.location.href = '/auth/login';
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleViewPrescription = async (prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionModal(true);
  };

  const handleDispensePrescription = async () => {
    if (!selectedPrescription) return;

    setDispensing(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/pharmacist?action=dispense-prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prescriptionId: selectedPrescription.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to dispense prescription');
      }

      setSuccess('Prescription dispensed successfully!');
      fetchPrescriptions();
      fetchStats();

      setTimeout(() => {
        setShowPrescriptionModal(false);
        setSelectedPrescription(null);
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to dispense prescription');
    } finally {
      setDispensing(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.prescriptionId.toLowerCase().includes(searchLower) ||
      p.patient.firstName.toLowerCase().includes(searchLower) ||
      p.patient.lastName.toLowerCase().includes(searchLower) ||
      p.patient.patientId.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-green-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-green-600 to-teal-600 p-2 rounded-lg">
                <Pill className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Pharmacist Dashboard</h1>
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
            <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Prescription Management</h2>
              <p className="text-gray-700 mt-2 font-medium">Dispense medications and manage prescriptions</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md border-2 border-orange-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-800 mb-1">Pending</p>
                    <p className="text-4xl font-bold text-orange-900">{stats?.pendingPrescriptions || 0}</p>
                  </div>
                  <div className="bg-orange-600 p-4 rounded-xl shadow-md">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md border-2 border-green-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">Dispensed Today</p>
                    <p className="text-4xl font-bold text-green-900">{stats?.dispensedToday || 0}</p>
                  </div>
                  <div className="bg-green-600 p-4 rounded-xl shadow-md">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md border-2 border-blue-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">Dispensed This Week</p>
                    <p className="text-4xl font-bold text-blue-900">{stats?.dispensedThisWeek || 0}</p>
                  </div>
                  <div className="bg-blue-600 p-4 rounded-xl shadow-md">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md border-2 border-purple-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-800 mb-1">Total Prescriptions</p>
                    <p className="text-4xl font-bold text-purple-900">{stats?.totalPrescriptions || 0}</p>
                  </div>
                  <div className="bg-purple-600 p-4 rounded-xl shadow-md">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Prescriptions Table */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900">Prescriptions</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by prescription ID, patient name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                >
                  <option value="pending">Pending</option>
                  <option value="dispensed">Dispensed</option>
                  <option value="all">All</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Prescription ID</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Patient</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Doctor</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Date</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrescriptions.map((p) => (
                      <tr key={p.id} className="border-b border-gray-200 hover:bg-green-50 transition-colors">
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900">{p.prescriptionId}</td>
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                          {p.patient.firstName} {p.patient.lastName}
                          <br />
                          <span className="text-xs text-gray-600 font-medium">{p.patient.patientId}</span>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">
                          Dr. {p.doctor.firstName} {p.doctor.lastName}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                              p.isDispensed
                                ? 'bg-green-200 text-green-900'
                                : 'bg-orange-200 text-orange-900'
                            }`}
                          >
                            {p.isDispensed ? 'Dispensed' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <button
                            onClick={() => handleViewPrescription(p)}
                            className="text-green-700 font-bold hover:text-green-900 hover:underline transition-colors"
                          >
                            View Details
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

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-gray-200">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-orange-100 p-4 rounded-full">
                <Lock className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">Change Password Required</h3>
            <p className="text-sm text-gray-600 font-medium text-center mb-6">
              For security reasons, you must change your password before continuing.
            </p>

            {passwordError && (
              <div className="mb-4 text-sm font-semibold text-red-800 bg-red-100 border-2 border-red-300 rounded-lg px-4 py-3">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Current Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showOldPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  New Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-600 font-medium mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Confirm New Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-green-600 to-teal-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {passwordLoading ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-500 font-medium text-center mt-4">
              You will be logged out after changing your password
            </p>
          </div>
        </div>
      )}

      {/* View Prescription Modal */}
      {showPrescriptionModal && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-gray-200 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Prescription Details</h3>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  ID: <span className="font-semibold text-gray-900">{selectedPrescription.prescriptionId}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPrescriptionModal(false);
                  setSelectedPrescription(null);
                }}
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

            {/* Patient Info */}
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200 mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Patient Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">Name:</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {selectedPrescription.patient.firstName} {selectedPrescription.patient.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Patient ID:</p>
                  <p className="text-sm text-gray-700 font-medium">{selectedPrescription.patient.patientId}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Phone:</p>
                  <p className="text-sm text-gray-700 font-medium">{selectedPrescription.patient.phone}</p>
                </div>
                {selectedPrescription.patient.email && (
                  <div>
                    <p className="text-sm font-bold text-gray-900">Email:</p>
                    <p className="text-sm text-gray-700 font-medium">{selectedPrescription.patient.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Doctor Info */}
            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200 mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Prescribing Doctor</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">Doctor:</p>
                  <p className="text-sm text-gray-700 font-medium">
                    Dr. {selectedPrescription.doctor.firstName} {selectedPrescription.doctor.lastName}
                  </p>
                </div>
                {selectedPrescription.doctor.specialization && (
                  <div>
                    <p className="text-sm font-bold text-gray-900">Specialization:</p>
                    <p className="text-sm text-gray-700 font-medium">{selectedPrescription.doctor.specialization}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnosis */}
            {selectedPrescription.diagnosis && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-2">Diagnosis</h4>
                <p className="text-sm text-gray-700 font-medium bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {selectedPrescription.diagnosis}
                </p>
              </div>
            )}

            {/* Medicines */}
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Pill className="w-5 h-5 mr-2" />
                Medicines
              </h4>
              <div className="space-y-3">
                {selectedPrescription.medicines.map((med, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-green-50 to-teal-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg">{med.medicineName}</p>
                        <div className="grid grid-cols-3 gap-4 mt-2">
                          <div>
                            <p className="text-xs font-bold text-gray-700">Dosage:</p>
                            <p className="text-sm text-gray-900 font-medium">{med.dosage}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700">Frequency:</p>
                            <p className="text-sm text-gray-900 font-medium">{med.frequency}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700">Duration:</p>
                            <p className="text-sm text-gray-900 font-medium">{med.duration}</p>
                          </div>
                        </div>
                        {med.instructions && (
                          <div className="mt-2">
                            <p className="text-xs font-bold text-gray-700">Instructions:</p>
                            <p className="text-sm text-gray-900 font-medium">{med.instructions}</p>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        #{idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {selectedPrescription.notes && (
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-2">Additional Notes</h4>
                <p className="text-sm text-gray-700 font-medium bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {selectedPrescription.notes}
                </p>
              </div>
            )}

            {/* Status */}
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">Status:</p>
                  <p className={`text-lg font-bold ${selectedPrescription.isDispensed ? 'text-green-700' : 'text-orange-700'}`}>
                    {selectedPrescription.isDispensed ? 'Dispensed' : 'Pending'}
                  </p>
                </div>
                {selectedPrescription.isDispensed && selectedPrescription.dispensedAt && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">Dispensed On:</p>
                    <p className="text-sm text-gray-700 font-medium flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(selectedPrescription.dispensedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
              <button
                onClick={() => {
                  setShowPrescriptionModal(false);
                  setSelectedPrescription(null);
                }}
                className="px-6 py-3 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
              >
                Close
              </button>
              {!selectedPrescription.isDispensed && (
                <button
                  onClick={handleDispensePrescription}
                  disabled={dispensing}
                  className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-green-600 to-teal-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {dispensing ? 'Dispensing...' : 'Mark as Dispensed'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PharmacistDashboard() {
  return (
    <ProtectedRoute allowedRoles={['PHARMACIST']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
