import { NextResponse } from 'next/server';
import { 
  authenticate, 
  comparePassword, 
  generateTokens, 
  verifyRefreshToken,
  hashPassword,
  revokeRefreshToken 
} from '@/lib/auth';
import { db, prisma } from '@/lib/db';
import { ApiResponse, schemas, handleApiError } from '@/lib/utils';
// ============================================
// POST /api/auth?action=register
// ============================================
async function handleRegister(req) {
  try {
    const body = await req.json();
    
    const {
      hospitalName,
      licenseNumber,
      email,
      phone,
      address,
      city,
      state,
      country,
      pincode,
      firstName,
      lastName,
      adminEmail,
      username,
      password,
    } = body;

    // Validate required fields
    if (!hospitalName || !licenseNumber || !email || !phone || !address ||
        !firstName || !lastName || !adminEmail || !username || !password) {
      return NextResponse.json(
        ApiResponse.error('All required fields must be filled', 400),
        { status: 400 }
      );
    }

    // Check if hospital email already exists
    const existingHospital = await prisma.hospital.findUnique({
      where: { email },
    });

    if (existingHospital) {
      return NextResponse.json(
        ApiResponse.error('Hospital with this email already exists', 409),
        { status: 409 }
      );
    }

    // Check if license number already exists
    const existingLicense = await prisma.hospital.findUnique({
      where: { licenseNumber },
    });

    if (existingLicense) {
      return NextResponse.json(
        ApiResponse.error('Hospital with this license number already exists', 409),
        { status: 409 }
      );
    }

    // Check if admin email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { username },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        ApiResponse.error('Email or username already exists', 409),
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Get HOSPITAL_ADMIN role
    const hospitalAdminRole = await prisma.role.findUnique({
      where: { name: 'HOSPITAL_ADMIN' },
    });

    if (!hospitalAdminRole) {
      return NextResponse.json(
        ApiResponse.error('Hospital admin role not found', 500),
        { status: 500 }
      );
    }

    // Create hospital and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create hospital
      const hospital = await tx.hospital.create({
        data: {
          name: hospitalName,
          licenseNumber,
          email,
          phone,
          address,
          city: city || null,
          state: state || null,
          country: country || null,
          pincode: pincode || null,
          status: 'PENDING',
          isEmailVerified: false,
        },
      });

      // Create hospital admin user
      const adminUser = await tx.user.create({
        data: {
          tenantId: hospital.tenantId,
          hospitalId: hospital.id,
          firstName,
          lastName,
          email: adminEmail,
          username,
          phone,
          password: hashedPassword,
          status: 'ACTIVE',
          isEmailVerified: false,
          mustChangePassword: false,
          roleIds: [hospitalAdminRole.id],
        },
      });

      return { hospital, adminUser };
    });

    return NextResponse.json(
      ApiResponse.success(
        {
          hospitalId: result.hospital.id,
          message: 'Registration successful. Your hospital is pending approval.',
        },
        'Hospital registered successfully'
      ),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      handleApiError(error, 'Registration failed'),
      { status: 500 }
    );
  }
}


// ============================================
// POST /api/auth?action=login
// ============================================
async function handleLogin(req) {
  try {
    const body = await req.json();
    
    // Validate input
    const validation = schemas.login.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        ApiResponse.error('Validation failed', 400, validation.error.errors),
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find user with roles and permissions
    const user = await db.getUserWithRoles(email);

    if (!user) {
      return NextResponse.json(
        ApiResponse.error('Invalid email or password', 401),
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        ApiResponse.error('Invalid email or password', 401),
        { status: 401 }
      );
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        ApiResponse.error(`Account is ${user.status.toLowerCase()}`, 403),
        { status: 403 }
      );
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

    // Generate tokens
    const roles = user.roles.map(r => r.name);
    const { accessToken, refreshToken } = await generateTokens(user, roles, permissions);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      ApiResponse.success(
        {
          user: {
            id: userWithoutPassword.id,
            firstName: userWithoutPassword.firstName,
            lastName: userWithoutPassword.lastName,
            email: userWithoutPassword.email,
            username: userWithoutPassword.username,
            tenantId: userWithoutPassword.tenantId,
            roles,
            permissions,
          },
          accessToken,
          refreshToken,
        },
        'Login successful'
      )
    );
  } catch (error) {
    return NextResponse.json(
      handleApiError(error, 'Login failed'),
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/auth?action=refresh
// ============================================
async function handleRefresh(req) {
  try {
    const body = await req.json();
    
    const validation = schemas.refreshToken.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        ApiResponse.error('Refresh token required', 400),
        { status: 400 }
      );
    }

    const { refreshToken } = validation.data;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json(
        ApiResponse.error('Invalid or expired refresh token', 401),
        { status: 401 }
      );
    }

    // Check if token exists and is not revoked
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!tokenRecord || tokenRecord.isRevoked) {
      return NextResponse.json(
        ApiResponse.error('Refresh token is invalid or revoked', 401),
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date() > tokenRecord.expiresAt) {
      return NextResponse.json(
        ApiResponse.error('Refresh token has expired', 401),
        { status: 401 }
      );
    }

    // Get user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: {
          include: { permissions: true },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json(
        ApiResponse.error('User not found or inactive', 401),
        { status: 401 }
      );
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

    // Generate new access token
    const { generateAccessToken } = await import('@/lib/auth');
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles.map(r => r.name),
      permissions,
    });

    return NextResponse.json(
      ApiResponse.success({ accessToken }, 'Token refreshed successfully')
    );
  } catch (error) {
    return NextResponse.json(
      handleApiError(error, 'Token refresh failed'),
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/auth?action=logout
// ============================================
async function handleLogout(req) {
  try {
    // Authenticate user
    const auth = await authenticate(req);
    if (!auth.authenticated) {
      return NextResponse.json(
        ApiResponse.error(auth.error, auth.status),
        { status: auth.status }
      );
    }

    const body = await req.json();
    const { refreshToken } = body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    return NextResponse.json(
      ApiResponse.success(null, 'Logged out successfully')
    );
  } catch (error) {
    return NextResponse.json(
      handleApiError(error, 'Logout failed'),
      { status: 500 }
    );
  }
}

// ============================================
// ROUTE HANDLER
// ============================================
export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'login':
      return handleLogin(req);
    case 'register':
      return handleRegister(req);
    case 'refresh':
      return handleRefresh(req);
    case 'logout':
      return handleLogout(req);
    default:
      return NextResponse.json(
        ApiResponse.error('Invalid action', 400),
        { status: 400 }
      );
  }
}


