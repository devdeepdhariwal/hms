import { NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/lib/auth';
import { db, prisma } from '@/lib/db';
import { 
  ApiResponse, 
  parseQueryParams, 
  buildPagination, 
  buildWhereClause,
  handleApiError,
  schemas 
} from '@/lib/utils';

// ============================================
// HELPER: Check Super Admin
// ============================================
async function checkSuperAdmin(req) {
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return { error: NextResponse.json(ApiResponse.error(auth.error, auth.status), { status: auth.status }) };
  }

  if (!requireRole(auth.user.roles, 'SUPER_ADMIN')) {
    return { error: NextResponse.json(ApiResponse.error('Access denied. Super admin only.', 403), { status: 403 }) };
  }

  return { user: auth.user };
}

// ============================================
// GET /api/admin?action=hospitals
// ============================================
async function getHospitals(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const { page, limit, search, status, sortBy, sortOrder } = parseQueryParams(searchParams);

    // Build where clause
    const where = buildWhereClause(
      search,
      ['name', 'email', 'licenseNumber', 'phone'],
      status ? { status } : {}
    );

    // Get total count
    const total = await prisma.hospital.count({ where });

    // Get hospitals
    const hospitals = await db.getHospitalsWithStats(
      where,
      (page - 1) * limit,
      limit,
      { [sortBy]: sortOrder }
    );

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(
      ApiResponse.paginated(hospitals, pagination, 'Hospitals fetched successfully')
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch hospitals'), { status: 500 });
  }
}

// ============================================
// GET /api/admin?action=hospital&id=xxx
// ============================================
async function getHospital(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Hospital ID is required', 400), { status: 400 });
    }

    const hospital = await db.getHospitalById(id);

    if (!hospital) {
      return NextResponse.json(ApiResponse.error('Hospital not found', 404), { status: 404 });
    }

    return NextResponse.json(ApiResponse.success(hospital, 'Hospital fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch hospital'), { status: 500 });
  }
}

// ============================================
// PATCH /api/admin?action=hospital-update&id=xxx
// ============================================
async function updateHospital(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Hospital ID is required', 400), { status: 400 });
    }

    const body = await req.json();
    const validation = schemas.hospitalUpdate.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        ApiResponse.error('Validation failed', 400, validation.error.errors),
        { status: 400 }
      );
    }

    const hospital = await prisma.hospital.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(ApiResponse.success(hospital, 'Hospital updated successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to update hospital'), { status: 500 });
  }
}

// ============================================
// PATCH /api/admin?action=hospital-approve&id=xxx
// ============================================
async function approveHospital(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Hospital ID is required', 400), { status: 400 });
    }

    const hospital = await db.updateHospitalStatus(id, 'ACTIVE', {
      isEmailVerified: true,
      activatedAt: new Date(),
    });

    return NextResponse.json(ApiResponse.success(hospital, 'Hospital approved successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to approve hospital'), { status: 500 });
  }
}

// ============================================
// PATCH /api/admin?action=hospital-suspend&id=xxx
// ============================================
async function suspendHospital(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Hospital ID is required', 400), { status: 400 });
    }

    const hospital = await db.updateHospitalStatus(id, 'SUSPENDED', {
      suspendedAt: new Date(),
    });

    return NextResponse.json(ApiResponse.success(hospital, 'Hospital suspended successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to suspend hospital'), { status: 500 });
  }
}

// ============================================
// PATCH /api/admin?action=hospital-reactivate&id=xxx
// ============================================
async function reactivateHospital(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Hospital ID is required', 400), { status: 400 });
    }

    const hospital = await db.updateHospitalStatus(id, 'ACTIVE', {
      suspendedAt: null,
    });

    return NextResponse.json(ApiResponse.success(hospital, 'Hospital reactivated successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to reactivate hospital'), { status: 500 });
  }
}

// ============================================
// DELETE /api/admin?action=hospital-delete&id=xxx
// ============================================
async function deleteHospital(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Hospital ID is required', 400), { status: 400 });
    }

    await prisma.hospital.delete({ where: { id } });

    return NextResponse.json(ApiResponse.success(null, 'Hospital deleted successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to delete hospital'), { status: 500 });
  }
}

// ============================================
// GET /api/admin?action=dashboard-stats
// ============================================
async function getDashboardStats(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const stats = await db.getDashboardStats();

    return NextResponse.json(ApiResponse.success(stats, 'Dashboard stats fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch dashboard stats'), { status: 500 });
  }
}

// ============================================
// GET /api/admin?action=hospital-stats
// ============================================
async function getHospitalStats(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const stats = await db.getHospitalStats();

    return NextResponse.json(ApiResponse.success(stats, 'Hospital statistics fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch hospital statistics'), { status: 500 });
  }
}

// ============================================
// GET /api/admin?action=users
// ============================================
async function getUsers(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const { page, limit, search, status, tenantId, sortBy, sortOrder } = parseQueryParams(searchParams);

    const where = buildWhereClause(
      search,
      ['firstName', 'lastName', 'email', 'username'],
      {
        ...(status && { status }),
        ...(tenantId && { tenantId }),
      }
    );

    const total = await prisma.user.count({ where });

    const users = await db.getAllUsers(
      where,
      (page - 1) * limit,
      limit,
      { [sortBy]: sortOrder }
    );

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(users, pagination, 'Users fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch users'), { status: 500 });
  }
}

// ============================================
// GET /api/admin?action=permissions
// ============================================
async function getPermissions(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const permissions = await db.getAllPermissions();

    // Group by resource
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {});

    return NextResponse.json(
      ApiResponse.success(
        { permissions, groupedPermissions },
        'Permissions fetched successfully'
      )
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch permissions'), { status: 500 });
  }
}

// ============================================
// GET /api/admin?action=roles
// ============================================
async function getRoles(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const roles = await db.getAllRoles();

    return NextResponse.json(ApiResponse.success(roles, 'Roles fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch roles'), { status: 500 });
  }
}

// ============================================
// GET /api/admin?action=search&q=xxx
// ============================================
async function globalSearch(req) {
  try {
    const check = await checkSuperAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json(
        ApiResponse.error('Search query must be at least 2 characters', 400),
        { status: 400 }
      );
    }

    const results = await db.globalSearch(query);

    return NextResponse.json(ApiResponse.success(results, 'Search results fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Search failed'), { status: 500 });
  }
}

// ============================================
// ROUTE HANDLERS
// ============================================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'hospitals':
      return getHospitals(req);
    case 'hospital':
      return getHospital(req);
    case 'dashboard-stats':
      return getDashboardStats(req);
    case 'hospital-stats':
      return getHospitalStats(req);
    case 'users':
      return getUsers(req);
    case 'permissions':
      return getPermissions(req);
    case 'roles':
      return getRoles(req);
    case 'search':
      return globalSearch(req);
    default:
      return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
  }
}

export async function PATCH(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'hospital-update':
      return updateHospital(req);
    case 'hospital-approve':
      return approveHospital(req);
    case 'hospital-suspend':
      return suspendHospital(req);
    case 'hospital-reactivate':
      return reactivateHospital(req);
    default:
      return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'hospital-delete':
      return deleteHospital(req);
    default:
      return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
  }
}

export async function POST(req) {
  return NextResponse.json(ApiResponse.error('Method not allowed', 405), { status: 405 });
}
