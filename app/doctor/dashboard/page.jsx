'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Users,
  UserPlus,
  FileText,
  Activity,
  LogOut,
  Search,
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Plus,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

function DashboardContent() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [patientType, setPatientType] = useState('');

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [registerLoading, setRegisterLoading] = useState(false);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
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

  const [patientForm, setPatientForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE',
    bloodGroup: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    patientType: 'OPD',
  });

  const [prescriptionForm, setPrescriptionForm] = useState({
    diagnosis: '',
    notes: '',
    medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Check if user must change password
    if (userData?.mustChangePassword) {
      setShowPasswordModal(true);
    }
    
    fetchStats();
    fetchPatients();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/doctor?action=dashboard-stats', {
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
      const res = await fetch('/api/doctor?action=patients', {
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
      const res = await fetch('/api/doctor?action=reset-password', {
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
      
      // Logout and redirect to login
      localStorage.clear();
      window.location.href = '/auth/login';
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/doctor?action=register-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patientForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to register patient');
      }

      setSuccess(`Patient registered! ID: ${data.data.patientId}`);
      fetchPatients();
      fetchStats();

      setTimeout(() => {
        setShowRegisterModal(false);
        setPatientForm({
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          gender: 'MALE',
          bloodGroup: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelation: '',
          patientType: 'OPD',
        });
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to register patient');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    setPrescriptionLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/doctor?action=create-prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          ...prescriptionForm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create prescription');
      }

      setSuccess(`Prescription created! ID: ${data.data.prescriptionId}`);

      setTimeout(() => {
        setShowPrescriptionModal(false);
        setSelectedPatient(null);
        setPrescriptionForm({
          diagnosis: '',
          notes: '',
          medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        });
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to create prescription');
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const addMedicine = () => {
    setPrescriptionForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    }));
  };

  const removeMedicine = (index) => {
    setPrescriptionForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
  };

  const updateMedicine = (index, field, value) => {
    setPrescriptionForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((med, i) => (i === index ? { ...med, [field]: value } : med)),
    }));
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-blue-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Doctor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">
                  Dr. {user?.firstName} {user?.lastName}
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
              <h2 className="text-3xl font-bold text-gray-900">Patient Management</h2>
              <p className="text-gray-700 mt-2 font-medium">Manage patients and prescriptions</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md border-2 border-blue-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">Total Patients</p>
                    <p className="text-4xl font-bold text-blue-900">{stats?.totalPatients || 0}</p>
                  </div>
                  <div className="bg-blue-600 p-4 rounded-xl shadow-md">
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

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md border-2 border-purple-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-800 mb-1">IPD Patients</p>
                    <p className="text-4xl font-bold text-purple-900">{stats?.ipdPatients || 0}</p>
                  </div>
                  <div className="bg-purple-600 p-4 rounded-xl shadow-md">
                    <Activity className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md border-2 border-orange-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-800 mb-1">Prescriptions Today</p>
                    <p className="text-4xl font-bold text-orange-900">{stats?.todayPrescriptions || 0}</p>
                  </div>
                  <div className="bg-orange-600 p-4 rounded-xl shadow-md">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Patients Table */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-gray-900">Patients</h3>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Register Patient</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <select
                  value={patientType}
                  onChange={(e) => setPatientType(e.target.value)}
                  className="px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Gender</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-gray-800">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p) => (
                      <tr key={p.id} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
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
                                : 'bg-purple-200 text-purple-900'
                            }`}
                          >
                            {p.patientType}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">{p.gender}</td>
                        <td className="py-4 px-4 text-sm">
                          <button
                            onClick={() => {
                              setSelectedPatient(p);
                              setShowPrescriptionModal(true);
                            }}
                            className="text-blue-700 font-bold hover:text-blue-900 hover:underline transition-colors"
                          >
                            Create Prescription
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

      {/* Force Password Change Modal */}
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                <p className="text-xs text-gray-600 font-medium mt-1">Minimum 8 characters, including uppercase, lowercase, number, and special character</p>
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                  className="w-full px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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

      {/* Register Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-gray-200 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Register New Patient</h3>
              <button onClick={() => setShowRegisterModal(false)} className="hover:bg-gray-100 p-2 rounded-lg transition-colors">
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

            <form onSubmit={handleRegisterPatient} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    First Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={patientForm.firstName}
                    onChange={(e) => setPatientForm({ ...patientForm, firstName: e.target.value })}
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
                    value={patientForm.lastName}
                    onChange={(e) => setPatientForm({ ...patientForm, lastName: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Date of Birth <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={patientForm.dateOfBirth}
                    onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Gender <span className="text-red-600">*</span>
                  </label>
                  <select
                    required
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Blood Group</label>
                  <input
                    type="text"
                    value={patientForm.bloodGroup}
                    onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="A+"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
                  <input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Phone <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Address</label>
                <input
                  type="text"
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Street Address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">City</label>
                  <input
                    type="text"
                    value={patientForm.city}
                    onChange={(e) => setPatientForm({ ...patientForm, city: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">State</label>
                  <input
                    type="text"
                    value={patientForm.state}
                    onChange={(e) => setPatientForm({ ...patientForm, state: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Pincode</label>
                  <input
                    type="text"
                    value={patientForm.pincode}
                    onChange={(e) => setPatientForm({ ...patientForm, pincode: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="border-t-2 border-gray-200 pt-5">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Emergency Contact</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={patientForm.emergencyContactName}
                      onChange={(e) => setPatientForm({ ...patientForm, emergencyContactName: e.target.value })}
                      className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Phone <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={patientForm.emergencyContactPhone}
                      onChange={(e) => setPatientForm({ ...patientForm, emergencyContactPhone: e.target.value })}
                      className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Relation</label>
                    <input
                      type="text"
                      value={patientForm.emergencyContactRelation}
                      onChange={(e) => setPatientForm({ ...patientForm, emergencyContactRelation: e.target.value })}
                      className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      placeholder="Spouse"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Patient Type <span className="text-red-600">*</span>
                </label>
                <select
                  required
                  value={patientForm.patientType}
                  onChange={(e) => setPatientForm({ ...patientForm, patientType: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="OPD">OPD (Outpatient)</option>
                  <option value="IPD">IPD (Inpatient)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-6 py-3 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {registerLoading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Prescription Modal */}
      {showPrescriptionModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-gray-200 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Create Prescription</h3>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Patient: <span className="font-semibold text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</span> ({selectedPatient.patientId})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPrescriptionModal(false);
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

            <form onSubmit={handleCreatePrescription} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Diagnosis</label>
                <input
                  type="text"
                  value={prescriptionForm.diagnosis}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="e.g. Common Cold, Fever"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Notes</label>
                <textarea
                  value={prescriptionForm.notes}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="border-t-2 border-gray-200 pt-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-gray-900">Medicines</h4>
                  <button
                    type="button"
                    onClick={addMedicine}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {prescriptionForm.medicines.map((med, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="text-sm font-bold text-gray-900">Medicine {index + 1}</h5>
                        {prescriptionForm.medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMedicine(index)}
                            className="text-red-600 hover:text-red-800 font-semibold text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            required
                            value={med.medicineName}
                            onChange={(e) => updateMedicine(index, 'medicineName', e.target.value)}
                            className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Medicine Name *"
                          />
                        </div>
                        <input
                          type="text"
                          required
                          value={med.dosage}
                          onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                          className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Dosage (e.g. 500mg) *"
                        />
                        <input
                          type="text"
                          required
                          value={med.frequency}
                          onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                          className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Frequency (e.g. 2x daily) *"
                        />
                        <input
                          type="text"
                          required
                          value={med.duration}
                          onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                          className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Duration (e.g. 5 days) *"
                        />
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                          className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Instructions (e.g. After meals)"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrescriptionModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-3 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prescriptionLoading}
                  className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {prescriptionLoading ? 'Creating...' : 'Create Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorDashboard() {
  return (
    <ProtectedRoute allowedRoles={['DOCTOR']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
