import { z } from 'zod';

// ============================================
// API RESPONSE HELPER
// ============================================
export class ApiResponse {
  static success(data, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      statusCode,
    };
  }
  
  static error(message = 'Error', statusCode = 500, errors = null) {
    return {
      success: false,
      message,
      errors,
      statusCode,
    };
  }
  
  static paginated(data, pagination, message = 'Success') {
    return {
      success: true,
      message,
      data,
      pagination,
    };
  }
}

// ============================================
// VALIDATION SCHEMAS
// ============================================
export const schemas = {
  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
  
  hospitalApproval: z.object({
    status: z.enum(['VERIFIED', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'PENDING']),
    notes: z.string().optional(),
  }),
  
  hospitalUpdate: z.object({
    name: z.string().min(2).optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
  
  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
};

// ============================================
// QUERY HELPERS
// ============================================
export const parseQueryParams = (searchParams) => {
  return {
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    tenantId: searchParams.get('tenantId') || '',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
  };
};

export const buildPagination = (page, limit, total) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
  };
};

export const buildWhereClause = (search, searchFields, filters = {}) => {
  const where = { ...filters };
  
  if (search && searchFields.length > 0) {
    where.OR = searchFields.map(field => ({
      [field]: { contains: search, mode: 'insensitive' },
    }));
  }
  
  return where;
};

// ============================================
// ERROR HANDLER
// ============================================
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.name === 'ZodError') {
    return ApiResponse.error('Validation failed', 400, error.errors);
  }
  
  if (error.code === 'P2002') {
    return ApiResponse.error('Record already exists', 409);
  }
  
  if (error.code === 'P2025') {
    return ApiResponse.error('Record not found', 404);
  }
  
  return ApiResponse.error(error.message || defaultMessage, 500);
};

// ============================================
// DATE HELPERS
// ============================================
export const dateHelpers = {
  getStartOfMonth: () => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  },
  
  getStartOfDay: () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  },
  
  formatDate: (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },
  
  formatDateTime: (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};
