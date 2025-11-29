'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  HeartPulse,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Phone,
  MapPin,
  FileText,
  User,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // hospital
    hospitalName: '',
    address: '',
    email: '',      // hospital contact email
    phone: '',      // hospital contact phone
    licenseNumber: '',
    domain: '',     // hospital website/domain
    // admin
    firstName: '',
    lastName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    confirmPassword: '',
    otpCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(''); // for "OTP sent" message
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError('');
    setInfo('');
  };

  const validateStep1 = () => {
    if (!formData.hospitalName.trim()) {
      setError('Hospital name is required');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Hospital address is required');
      return false;
    }
    if (
      !formData.email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      setError('Valid hospital email is required');
      return false;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setError('Valid hospital phone number is required');
      return false;
    }
    if (!formData.licenseNumber.trim()) {
      setError('License number is required');
      return false;
    }
    if (!formData.domain.trim()) {
      setError('Hospital website / domain is required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required');
      return false;
    }
    if (
      !formData.adminEmail.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)
    ) {
      setError('Valid admin email is required');
      return false;
    }
    if (!formData.adminPhone.trim() || formData.adminPhone.length < 10) {
      setError('Valid admin phone number is required');
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(formData.password)
    ) {
      setError(
        'Password must contain uppercase, lowercase, number and special character'
      );
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (!formData.otpCode.trim()) {
      setError('Email verification code is required');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    setError('');
    setInfo('');
  };

  const handleSendOtp = async () => {
  if (
    !formData.adminEmail.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)
  ) {
    setError('Enter a valid admin email to send code');
    return;
  }

  setOtpSending(true);
  setError('');
  setInfo('');

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: formData.adminEmail,
        purpose: 'HOSPITAL_REGISTRATION',
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.error('Non‑JSON from /api/send-otp:', text.slice(0, 300));
      throw new Error('Server error while sending OTP');
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send verification code');
    }

    setOtpSent(true);
    setInfo('OTP sent! Check your email inbox/spam folder.');
  } catch (err) {
    setError(err.message || 'Failed to send verification code');
  } finally {
    setOtpSending(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) return;

    setLoading(true);
    setError('');
    setInfo('');

    try {
      const response = await fetch('/api/auth?action=register-hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName: formData.hospitalName,
          address: formData.address,
          email: formData.email,
          phone: formData.phone,
          licenseNumber: formData.licenseNumber,
          domain: formData.domain,
          firstName: formData.firstName,
          lastName: formData.lastName,
          adminEmail: formData.adminEmail,
          adminPhone: formData.adminPhone,
          password: formData.password,
          otpCode: formData.otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Registration Successful!
            </h2>
            <p className="text-base text-gray-800 mb-6">
              Your hospital registration is complete. Verification is pending and
              your account will be activated within 24 hours by the Super Admin.
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-3 rounded-xl">
              <HeartPulse className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              MediCare HMS
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Register Your Hospital
          </h1>
          <p className="text-base text-gray-800">
            Join hundreds of hospitals using MediCare HMS
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div
              className={`flex items-center space-x-2 ${
                step >= 1 ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                1
              </div>
              <span className="font-bold hidden sm:inline">Hospital Info</span>
            </div>
            <div
              className={`h-1 w-16 ${
                step >= 2 ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            ></div>
            <div
              className={`flex items-center space-x-2 ${
                step >= 2 ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                2
              </div>
              <span className="font-bold hidden sm:inline">Admin Details</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-900 font-semibold">{error}</p>
            </div>
          )}

          {info && (
            <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg text-sm text-green-900 font-semibold">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Hospital Information */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Building2 className="w-6 h-6 mr-2 text-blue-600" />
                  Hospital Information
                </h2>

                {/* Hospital Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Hospital Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="hospitalName"
                    value={formData.hospitalName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                    placeholder="Enter hospital name"
                    required
                  />
                </div>

                {/* License Number */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    License Number <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                      placeholder="Enter license number"
                      required
                    />
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Hospital Email <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                        placeholder="hospital@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Hospital Phone <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                        placeholder="1234567890"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Address <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={2}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                      placeholder="Enter full address"
                      required
                    />
                  </div>
                </div>

                {/* Domain / Website */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Hospital Website / Domain <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="domain"
                    value={formData.domain}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                    placeholder="e.g. citycare.com or https://citycare.com"
                    required
                  />
                  <p className="text-xs text-gray-700 mt-1 font-medium">
                    Admin username will be created as <strong>admin@your-domain</strong>.
                  </p>
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all text-base"
                >
                  Next: Admin Details →
                </button>
              </div>
            )}

            {/* Step 2: Admin Details */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <User className="w-6 h-6 mr-2 text-blue-600" />
                  Hospital Admin Details
                </h2>

                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      First Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                      placeholder="First name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Last Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>

                {/* Admin Phone */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Admin Phone <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="tel"
                      name="adminPhone"
                      value={formData.adminPhone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                      placeholder="Admin phone number"
                      required
                    />
                  </div>
                </div>

                {/* Admin Email + Send Code */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Admin Email <span className="text-red-600">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="email"
                        name="adminEmail"
                        value={formData.adminEmail}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpSending}
                      className="px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {otpSending
                        ? 'Sending...'
                        : otpSent
                        ? 'Resend Code'
                        : 'Send Code'}
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                      placeholder="Create a strong password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-700 mt-1 font-medium">
                    Must contain uppercase, lowercase, number and special
                    character
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Confirm Password <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                      placeholder="Re-enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* OTP Code */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Email Verification Code{' '}
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="otpCode"
                    value={formData.otpCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium"
                    placeholder="Enter 6-digit code"
                    required
                  />
                </div>

                {/* Buttons */}
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 py-3 border-2 border-gray-400 text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Registering...</span>
                      </span>
                    ) : (
                      'Complete Registration'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-gray-900 font-medium">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-blue-600 font-bold hover:text-blue-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
