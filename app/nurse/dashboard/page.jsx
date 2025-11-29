'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Users,
  Activity,
  FileText,
  LogOut,
  Search,
  X,
  Stethoscope,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Weight,
  ClipboardList,
} from 'lucide-react';

function DashboardContent() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [patientType, setPatientType] = useState('');

  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showCareNoteModal, setShowCareNoteModal] = useState(false);
  const [showPrescriptionsModal, setShowPrescriptionsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [careNoteLoading, setCareNoteLoading] = useState(false);
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

  const [vitalsForm, setVitalsForm] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    temperature: '',
    pulse: '',
    spO2: '',
    weight: '',
    notes: '',
  });

  const [careNote, setCareNote] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    if (userData?.mustChangePassword) {
      setShowPasswordModal(true);
    }
    
    fetchStats();
    fetchPatients();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/nurse?action=dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/nurse?action=assigned-patients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPatients(data.data);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
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
      const res = await fetch('/api/nurse?action=reset-password', {
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

  const handleRecordVitals = async (e) => {
    e.preventDefault();
    setVitalsLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/nurse?action=record-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          ...vitalsForm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to record vitals');
      }

      setSuccess('Vitals recorded successfully!');
      fetchPatients();
      fetchStats();

      setTimeout(() => {
        setShowVitalsModal(false);
        setSelectedPatient(null);
        setVitalsForm({
          bloodPressureSystolic: '',
          bloodPressureDiastolic: '',
          temperature: '',
          pulse: '',
          spO2: '',
          weight: '',
          notes: '',
        });
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to record vitals');
    } finally {
      setVitalsLoading(false);
    }
  };

  const handleAddCareNote = async (e) => {
    e.preventDefault();
    setCareNoteLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/nurse?action=add-care-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          note: careNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to add care note');
      }

      setSuccess('Care note added successfully!');

      setTimeout(() => {
        setShowCareNoteModal(false);
        setSelectedPatient(null);
        setCareNote('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to add care note');
    } finally {
      setCareNoteLoading(false);
    }
  };

  const handleViewPrescriptions = async (patient) => {
    setSelectedPatient(patient);
    setShowPrescriptionsModal(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/nurse?action=prescriptions&patientId=${patient.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setPrescriptions(data.data);
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.firstName.toLowerCase().includes(search.toLowerCase()) ||
      p.lastName.toLowerCase().includes(search.toLowerCase()) ||
      p.patientId.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search);
    const matchesType = patientType ? p.patientType === patientType : true;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-purple-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Nurse Dashboard</h1>
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
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Patient Care</h2>
              <p className="text-gray-700 mt-2 font-medium">Monitor and care for assigned patients</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md border-2 border-purple-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-800 mb-1">Total Patients</p>
                    <p className="text-4xl font-bold text-purple-900">{stats?.totalPatients || 0}</p>
                  </div>
                  <div className="bg-purple-600 p-4 rounded-xl shadow-md">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md border-2 border-green-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800 mb-1">OPD Patients</p>
                    <p className="text-4xl font-bold text-green-900">{stats?.opdPatients || 0}</p>
                  </div>
                  <div className="bg-green-600 p-4 rounded-xl shadow-md">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md border-2 border-blue-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">IPD Patients</p>
                    <p className="text-4xl font-bold text-blue-900">{stats?.ipdPatients || 0}</p>
                  </div>
                  <div className="bg-blue-600 p-4 rounded-xl shadow-md">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md border-2 border-orange-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-800 mb-1">Vitals Today</p>
                    <p className="text-4xl font-bold text-orange-900">{stats?.vitalsToday || 0}</p>
                  </div>
                  <div className="bg-orange-600 p-4 rounded-xl shadow-md">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Patients Table */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900">Assigned Patients</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>

                <select
                  value={patientType}
                  onChange={(e) => setPatientType(e.target.value)}
                  className="px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="">All Types</option>
                  <option value="OPD">OPD</option>
                  <option value="IPD">IPD</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Patient ID</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Name</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Contact</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Type</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => (
                      <tr key={p.id} className="border-b border-gray-200 hover:bg-purple-50 transition-colors">
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900">{p.patientId}</td>
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                          {p.firstName} {p.lastName}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">{p.phone}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${
                              p.patientType === 'OPD'
                                ? 'bg-green-200 text-green-900'
                                : 'bg-blue-200 text-blue-900'
                            }`}
                          >
                            {p.patientType}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedPatient(p);
                                setShowVitalsModal(true);
                              }}
                              className="text-purple-700 font-bold hover:text-purple-900 hover:underline transition-colors text-sm"
                            >
                              Record Vitals
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                              onClick={() => {
                                setSelectedPatient(p);
                                setShowCareNoteModal(true);
                              }}
                              className="text-blue-700 font-bold hover:text-blue-900 hover:underline transition-colors text-sm"
                            >
                              Add Note
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                              onClick={() => handleViewPrescriptions(p)}
                              className="text-green-700 font-bold hover:text-green-900 hover:underline transition-colors text-sm"
                            >
                              View Rx
                            </button>
                          </div>
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                  className="w-full px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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

      {/* Record Vitals Modal */}
      {showVitalsModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-200 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Record Vitals</h3>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Patient: <span className="font-semibold text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</span> ({selectedPatient.patientId})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVitalsModal(false);
                  setSelectedPatient(null);
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

            <form onSubmit={handleRecordVitals} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <Heart className="w-4 h-4 inline mr-1" />
                    BP Systolic (mmHg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsForm.bloodPressureSystolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureSystolic: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <Heart className="w-4 h-4 inline mr-1" />
                    BP Diastolic (mmHg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsForm.bloodPressureDiastolic}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, bloodPressureDiastolic: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <Thermometer className="w-4 h-4 inline mr-1" />
                    Temperature (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsForm.temperature}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, temperature: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="98.6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <Activity className="w-4 h-4 inline mr-1" />
                    Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    value={vitalsForm.pulse}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, pulse: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="72"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <Wind className="w-4 h-4 inline mr-1" />
                    SpO2 (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsForm.spO2}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, spO2: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="98"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    <Weight className="w-4 h-4 inline mr-1" />
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsForm.weight}
                    onChange={(e) => setVitalsForm({ ...vitalsForm, weight: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="70"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Notes</label>
                <textarea
                  value={vitalsForm.notes}
                  onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="Additional observations..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowVitalsModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-3 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vitalsLoading}
                  className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {vitalsLoading ? 'Recording...' : 'Record Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Care Note Modal */}
      {showCareNoteModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg border-2 border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Add Care Note</h3>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Patient: <span className="font-semibold text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCareNoteModal(false);
                  setSelectedPatient(null);
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

            <form onSubmit={handleAddCareNote} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Care Note <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  value={careNote}
                  onChange={(e) => setCareNote(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="Patient showed improvement, medication administered at 2:00 PM..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCareNoteModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-3 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={careNoteLoading}
                  className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {careNoteLoading ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Prescriptions Modal */}
      {showPrescriptionsModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-gray-200 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Prescriptions</h3>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Patient: <span className="font-semibold text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</span> ({selectedPatient.patientId})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPrescriptionsModal(false);
                  setSelectedPatient(null);
                  setPrescriptions([]);
                }}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            {prescriptions.length === 0 ? (
              <p className="text-center text-gray-600 font-medium py-8">No prescriptions found</p>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Prescription ID: {rx.prescriptionId}</p>
                        <p className="text-xs text-gray-600 font-medium mt-1">
                          Dr. {rx.doctor.firstName} {rx.doctor.lastName} • {new Date(rx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {rx.diagnosis && (
                      <div className="mb-4">
                        <p className="text-sm font-bold text-gray-900">Diagnosis:</p>
                        <p className="text-sm text-gray-700 font-medium">{rx.diagnosis}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-bold text-gray-900 mb-2">Medicines:</p>
                      <div className="space-y-2">
                        {rx.medicines.map((med, idx) => (
                          <div key={idx} className="bg-white p-3 rounded border border-gray-300">
                            <p className="font-bold text-gray-900">{med.medicineName}</p>
                            <p className="text-sm text-gray-700 font-medium">
                              {med.dosage} • {med.frequency} • {med.duration}
                            </p>
                            {med.instructions && (
                              <p className="text-xs text-gray-600 font-medium mt-1">{med.instructions}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {rx.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <p className="text-sm font-bold text-gray-900">Notes:</p>
                        <p className="text-sm text-gray-700 font-medium">{rx.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NurseDashboard() {
  return (
    <ProtectedRoute allowedRoles={['NURSE']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
