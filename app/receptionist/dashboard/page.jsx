'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Users,
  UserPlus,
  LogOut,
  Search,
  X,
  Eye,
  EyeOff,
  Lock,
  Edit,
  IdCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Download,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

function DashboardContent() {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadingUpdateImage, setUploadingUpdateImage] = useState(false);
  const [updateImagePreview, setUpdateImagePreview] = useState('');
  const [selectedUpdateFile, setSelectedUpdateFile] = useState(null);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [patientType, setPatientType] = useState('');

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [registerLoading, setRegisterLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
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
    photoUrl: '',
  });

  const [updateForm, setUpdateForm] = useState({
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    photoUrl: '',
  });

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
      const res = await fetch('/api/receptionist?action=dashboard-stats', {
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
      const res = await fetch('/api/receptionist?action=patients', {
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
      const res = await fetch('/api/receptionist?action=reset-password', {
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

  // ✅ ADD THIS - Handle image file selection for register
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, and WebP are allowed.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds 2MB limit');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };


  const handleImageUpload = async () => {
    if (!selectedFile) return;

    setUploadingImage(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', 'patients');

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload image');
      }


      setPatientForm({ ...patientForm, photoUrl: data.data.url });
      setSuccess('Image uploaded successfully!');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };


  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview('');
    setPatientForm({ ...patientForm, photoUrl: '' });
  };


  const handleUpdateImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, and WebP are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds 2MB limit');
      return;
    }

    setSelectedUpdateFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setUpdateImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };


  const handleUpdateImageUpload = async () => {
    if (!selectedUpdateFile) return;

    setUploadingUpdateImage(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', selectedUpdateFile);
      formData.append('folder', 'patients');

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to upload image');
      }

      setUpdateForm({ ...updateForm, photoUrl: data.data.url });
      setSuccess('Image uploaded successfully!');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingUpdateImage(false);
    }
  };


  const handleRemoveUpdateImage = () => {
    setSelectedUpdateFile(null);
    setUpdateImagePreview('');
    setUpdateForm({ ...updateForm, photoUrl: '' });
  };


  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/receptionist?action=register-patient', {
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
          photoUrl: '',
        });
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to register patient');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/receptionist?action=update-patient', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          ...updateForm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update patient');
      }

      setSuccess('Patient updated successfully!');
      fetchPatients();

      setTimeout(() => {
        setShowUpdateModal(false);
        setSelectedPatient(null);
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to update patient');
    } finally {
      setUpdateLoading(false);
    }
  };

  const openUpdateModal = (patient) => {
    setSelectedPatient(patient);
    setUpdateForm({
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      city: patient.city || '',
      state: patient.state || '',
      pincode: patient.pincode || '',
      photoUrl: patient.photoUrl || '',
    });
    setShowUpdateModal(true);
  };

  const openDetailsModal = (patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };

  const printPatientCard = () => {
    if (!selectedPatient) return;
    window.print();
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.firstName.toLowerCase().includes(search.toLowerCase()) ||
      p.lastName.toLowerCase().includes(search.toLowerCase()) ||
      p.patientId.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase()));
    const matchesType = patientType ? p.patientType === patientType : true;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-pink-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-pink-600 to-rose-600 p-2 rounded-lg">
                <IdCard className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Receptionist Dashboard</h1>
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
            <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Patient Registration</h2>
              <p className="text-gray-700 mt-2 font-medium">Manage patient records and registrations</p>
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
                    <p className="text-sm font-semibold text-green-800 mb-1">Registered Today</p>
                    <p className="text-4xl font-bold text-green-900">{stats?.patientsToday || 0}</p>
                  </div>
                  <div className="bg-green-600 p-4 rounded-xl shadow-md">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md border-2 border-purple-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-800 mb-1">OPD Patients</p>
                    <p className="text-4xl font-bold text-purple-900">{stats?.opdPatients || 0}</p>
                  </div>
                  <div className="bg-purple-600 p-4 rounded-xl shadow-md">
                    <IdCard className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md border-2 border-orange-200 p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-orange-800 mb-1">IPD Patients</p>
                    <p className="text-4xl font-bold text-orange-900">{stats?.ipdPatients || 0}</p>
                  </div>
                  <div className="bg-orange-600 p-4 rounded-xl shadow-md">
                    <IdCard className="w-8 h-8 text-white" />
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
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all"
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
                    placeholder="Search by name, ID, phone, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                  />
                </div>

                <select
                  value={patientType}
                  onChange={(e) => setPatientType(e.target.value)}
                  className="px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                      <tr key={p.id} className="border-b border-gray-200 hover:bg-pink-50 transition-colors">
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900">{p.patientId}</td>
                        <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                          {p.firstName} {p.lastName}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-gray-700">{p.phone}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${p.patientType === 'OPD'
                              ? 'bg-purple-200 text-purple-900'
                              : 'bg-orange-200 text-orange-900'
                              }`}
                          >
                            {p.patientType}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openDetailsModal(p)}
                              className="text-blue-700 font-bold hover:text-blue-900 hover:underline transition-colors text-sm"
                            >
                              View
                            </button>
                            <span className="text-gray-400">|</span>
                            <button
                              onClick={() => openUpdateModal(p)}
                              className="text-pink-700 font-bold hover:text-pink-900 hover:underline transition-colors text-sm"
                            >
                              Update
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 pr-10 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                  className="w-full px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">State</label>
                  <input
                    type="text"
                    value={patientForm.state}
                    onChange={(e) => setPatientForm({ ...patientForm, state: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Pincode</label>
                  <input
                    type="text"
                    value={patientForm.pincode}
                    onChange={(e) => setPatientForm({ ...patientForm, pincode: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                      className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                      className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                      placeholder="9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Relation</label>
                    <input
                      type="text"
                      value={patientForm.emergencyContactRelation}
                      onChange={(e) => setPatientForm({ ...patientForm, emergencyContactRelation: e.target.value })}
                      className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
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
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                >
                  <option value="OPD">OPD (Outpatient)</option>
                  <option value="IPD">IPD (Inpatient)</option>
                </select>
              </div>

              {/* ✅ NEW IMAGE UPLOAD SECTION FOR REGISTER */}
              <div className="border-t-2 border-gray-200 pt-5">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Patient Photo (Optional)
                </h4>

                {/* Image Preview or Upload Area */}
                {imagePreview || patientForm.photoUrl ? (
                  <div className="relative w-40 h-40 mx-auto mb-4">
                    <img
                      src={imagePreview || patientForm.photoUrl}
                      alt="Patient preview"
                      className="w-full h-full object-cover rounded-lg border-2 border-pink-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-500 transition-all mb-4">
                    <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 font-medium mb-2">
                      Upload patient photo
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      JPG, PNG or WebP (max 2MB)
                    </p>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-all">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Upload Button */}
                {selectedFile && !patientForm.photoUrl && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={uploadingImage}
                      className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-60 transition-all"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </button>
                  </div>
                )}
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
                  className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {registerLoading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Patient Modal */}
      {showUpdateModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl border-2 border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Update Patient</h3>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.patientId})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUpdateModal(false);
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

            <form onSubmit={handleUpdatePatient} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={updateForm.phone}
                    onChange={(e) => setUpdateForm({ ...updateForm, phone: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
                  <input
                    type="email"
                    value={updateForm.email}
                    onChange={(e) => setUpdateForm({ ...updateForm, email: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Address</label>
                <input
                  type="text"
                  value={updateForm.address}
                  onChange={(e) => setUpdateForm({ ...updateForm, address: e.target.value })}
                  className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                  placeholder="Street Address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">City</label>
                  <input
                    type="text"
                    value={updateForm.city}
                    onChange={(e) => setUpdateForm({ ...updateForm, city: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">State</label>
                  <input
                    type="text"
                    value={updateForm.state}
                    onChange={(e) => setUpdateForm({ ...updateForm, state: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Pincode</label>
                  <input
                    type="text"
                    value={updateForm.pincode}
                    onChange={(e) => setUpdateForm({ ...updateForm, pincode: e.target.value })}
                    className="w-full px-4 py-3 text-gray-900 font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                    placeholder="123456"
                  />
                </div>
              </div>

              {/* ✅ NEW IMAGE UPLOAD SECTION FOR UPDATE */}
              <div className="border-t-2 border-gray-200 pt-5">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Update Photo
                </h4>

                {updateImagePreview || updateForm.photoUrl ? (
                  <div className="relative w-40 h-40 mx-auto mb-4">
                    <img
                      src={updateImagePreview || updateForm.photoUrl}
                      alt="Patient preview"
                      className="w-full h-full object-cover rounded-lg border-2 border-pink-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveUpdateImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-500 transition-all mb-4">
                    <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 font-medium mb-2">
                      Upload new photo
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      JPG, PNG or WebP (max 2MB)
                    </p>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-all">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleUpdateImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {selectedUpdateFile && !updateForm.photoUrl && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleUpdateImageUpload}
                      disabled={uploadingUpdateImage}
                      className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-60 transition-all"
                    >
                      {uploadingUpdateImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>


              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedPatient(null);
                  }}
                  className="px-6 py-3 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {updateLoading ? 'Updating...' : 'Update Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Patient Details Modal */}
      {showDetailsModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-gray-200 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Patient Details</h3>
                <p className="text-sm text-gray-600 font-medium mt-1">Read-only view</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPatient(null);
                }}
                className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              {/* Patient Photo - ✅ ADD THIS */}
              {selectedPatient.photoUrl && (
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <img
                      src={selectedPatient.photoUrl}
                      alt={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
                      className="w-32 h-32 rounded-full object-cover border-4 border-pink-300 shadow-lg"
                    />
                    <div className="absolute bottom-0 right-0 bg-gradient-to-r from-pink-600 to-rose-600 p-2 rounded-full border-2 border-white">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-lg border-2 border-pink-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Patient ID:</p>
                    <p className="text-sm text-gray-700 font-medium">{selectedPatient.patientId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Full Name:</p>
                    <p className="text-sm text-gray-700 font-medium">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Date of Birth:</p>
                    <p className="text-sm text-gray-700 font-medium flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Gender:</p>
                    <p className="text-sm text-gray-700 font-medium">{selectedPatient.gender}</p>
                  </div>
                  {selectedPatient.bloodGroup && (
                    <div>
                      <p className="text-sm font-bold text-gray-900">Blood Group:</p>
                      <p className="text-sm text-gray-700 font-medium">{selectedPatient.bloodGroup}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-900">Patient Type:</p>
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${selectedPatient.patientType === 'OPD'
                        ? 'bg-purple-200 text-purple-900'
                        : 'bg-orange-200 text-orange-900'
                        }`}
                    >
                      {selectedPatient.patientType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Contact Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Phone:</p>
                    <p className="text-sm text-gray-700 font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {selectedPatient.phone}
                    </p>
                  </div>
                  {selectedPatient.email && (
                    <div>
                      <p className="text-sm font-bold text-gray-900">Email:</p>
                      <p className="text-sm text-gray-700 font-medium flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        {selectedPatient.email}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-sm font-bold text-gray-900">Address:</p>
                    <p className="text-sm text-gray-700 font-medium flex items-start">
                      <MapPin className="w-4 h-4 mr-1 mt-0.5" />
                      {selectedPatient.address && (
                        <>
                          {selectedPatient.address}
                          {selectedPatient.city && `, ${selectedPatient.city}`}
                          {selectedPatient.state && `, ${selectedPatient.state}`}
                          {selectedPatient.pincode && ` - ${selectedPatient.pincode}`}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-orange-50 p-6 rounded-lg border-2 border-orange-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Emergency Contact</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Name:</p>
                    <p className="text-sm text-gray-700 font-medium">{selectedPatient.emergencyContactName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Phone:</p>
                    <p className="text-sm text-gray-700 font-medium">{selectedPatient.emergencyContactPhone}</p>
                  </div>
                  {selectedPatient.emergencyContactRelation && (
                    <div>
                      <p className="text-sm font-bold text-gray-900">Relation:</p>
                      <p className="text-sm text-gray-700 font-medium">{selectedPatient.emergencyContactRelation}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPatient(null);
                }}
                className="px-6 py-3 text-sm font-bold border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
              >
                Close
              </button>
              <button
                onClick={printPatientCard}
                className="px-6 py-3 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Print Patient Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceptionistDashboard() {
  return (
    <ProtectedRoute allowedRoles={['RECEPTIONIST']}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
