import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '1h';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// ============================================
// PASSWORD FUNCTIONS
// ============================================
export const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

export const validatePassword = (password) => {
  const checks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
  };
  
  const isValid = Object.values(checks).every(Boolean);
  const errors = [];
  
  if (!checks.minLength) errors.push('Password must be at least 8 characters');
  if (!checks.hasUpper) errors.push('Password must contain at least one uppercase letter');
  if (!checks.hasLower) errors.push('Password must contain at least one lowercase letter');
  if (!checks.hasNumber) errors.push('Password must contain at least one number');
  if (!checks.hasSpecial) errors.push('Password must contain at least one special character');
  
  return { isValid, errors };
};

// ============================================
// JWT FUNCTIONS
// ============================================
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
};

export const generateTokens = async (user, roles, permissions) => {
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    roles,
    permissions,
  });
  
  const refreshToken = generateRefreshToken({ userId: user.id });
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });
  
  return { accessToken, refreshToken };
};

export const revokeRefreshToken = async (token) => {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true, revokedAt: new Date() },
  });
};

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
export const authenticate = async (req) => {
  try {
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'No token provided', status: 401 };
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return { authenticated: false, error: 'Invalid or expired token', status: 401 };
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: {
          include: { permissions: true },
        },
      },
    });
    
    if (!user || user.status !== 'ACTIVE') {
      return { authenticated: false, error: 'User not found or inactive', status: 401 };
    }
    
    // Flatten permissions
    const permissions = [];
    user.roles.forEach(role => {
      role.permissions.forEach(permission => {
        if (!permissions.includes(permission.code)) {
          permissions.push(permission.code);
        }
      });
    });
    
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        roles: user.roles.map(r => r.name),
        permissions,
      },
    };
  } catch (error) {
    return { authenticated: false, error: 'Authentication failed', status: 500 };
  }
};

export const requireRole = (userRoles, requiredRole) => {
  return userRoles.includes(requiredRole) || userRoles.includes('SUPER_ADMIN');
};

export const requirePermission = (userPermissions, required) => {
  return userPermissions.includes(required) || userPermissions.includes('*:*');
};

// ============================================
// CLIENT-SIDE AUTH HELPERS
// ============================================
export const clientAuth = {
  getAccessToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  },
  
  getRefreshToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  },
  
  getUser: () => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  },
  
  setTokens: (accessToken, refreshToken, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
    }
  },
  
  clearTokens: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },
  
  isAuthenticated: () => {
    return !!clientAuth.getAccessToken();
  },
  
  getUserRoles: () => {
    const user = clientAuth.getUser();
    return user?.roles || [];
  },
  
  hasRole: (role) => {
    const roles = clientAuth.getUserRoles();
    return roles.includes(role);
  },
  
  getDashboardUrl: () => {
    const roles = clientAuth.getUserRoles();
    
    if (roles.includes('SUPER_ADMIN')) return '/admin/dashboard';
    if (roles.includes('HOSPITAL_ADMIN')) return '/hospital-admin/dashboard';
    if (roles.includes('DOCTOR')) return '/doctor/dashboard';
    if (roles.includes('NURSE')) return '/nurse/dashboard';
    if (roles.includes('PHARMACIST')) return '/pharmacist/dashboard';
    if (roles.includes('RECEPTIONIST')) return '/receptionist/dashboard';
    
    return '/dashboard';
  },
  
  logout: () => {
    clientAuth.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  },
};
