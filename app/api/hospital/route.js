// app/api/hospital/route.js
import { NextResponse } from 'next/server';
import { authenticate, requireRole, hashPassword, comparePassword, validatePassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiResponse, parseQueryParams, buildPagination, buildWhereClause, handleApiError } from '@/lib/utils';
import { sendWelcomeEmail, sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

async function checkHospitalAdmin(req) {
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return { error: NextResponse.json(ApiResponse.error(auth.error, auth.status), { status: auth.status }) };
  }

  if (!requireRole(auth.user.roles, 'HOSPITAL_ADMIN')) {
    return { error: NextResponse.json(ApiResponse.error('Access denied. Hospital admin only.', 403), { status: 403 }) };
  }

  return { user: auth.user };
}

function generateUsername(firstName, lastName, domain) {
  const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${cleanDomain}`;
}

function generateTempPassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const special = '@$!%*?&#';
  
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += nums[Math.floor(Math.random() * nums.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  const all = upper + lower + nums + special;
  for (let i = 0; i < 8; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function checkPasswordHistory(userId, newPassword) {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  for (const record of history) {
    if (await comparePassword(newPassword, record.passwordHash)) {
      return false;
    }
  }
  return true;
}

// POST /api/hospital?action=create-user
async function createUser(req) {
  try {
    const check = await checkHospitalAdmin(req);
    if (check.error) return check.error;

    const { firstName, lastName, email, phone, department, roleNames } = await req.json();

    if (!firstName || !lastName || !email || !phone || !roleNames || roleNames.length === 0) {
      return NextResponse.json(ApiResponse.error('All fields required', 400), { status: 400 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: check.user.id },
      include: { hospital: true },
    });

    if (!adminUser || !adminUser.hospital) {
      return NextResponse.json(ApiResponse.error('Hospital not found', 404), { status: 404 });
    }

    const hospital = adminUser.hospital;
    const username = generateUsername(firstName, lastName, hospital.domain);

    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json(ApiResponse.error('Email already exists', 409), { status: 409 });
    }

    if (await prisma.user.findUnique({ where: { username } })) {
      return NextResponse.json(ApiResponse.error('Username already exists', 409), { status: 409 });
    }

    // ✅ FETCH SYSTEM ROLES (shared across all hospitals)
    const roles = await prisma.role.findMany({
      where: { 
        name: { in: roleNames },
        isSystemRole: true
      },
    });

    if (roles.length !== roleNames.length) {
      return NextResponse.json(ApiResponse.error('One or more roles not found', 404), { status: 404 });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        tenantId: hospital.tenantId,
        hospitalId: hospital.id,
        firstName,
        lastName,
        email,
        phone,
        username,
        password: hashedPassword,
        department,
        status: 'ACTIVE',
        isEmailVerified: true,
        mustChangePassword: true,
        roleIds: roles.map((r) => r.id),
      },
    });

    await prisma.passwordHistory.create({
      data: { userId: user.id, passwordHash: hashedPassword },
    });

    await sendWelcomeEmail(email, { firstName, lastName, username, tempPassword });

    return NextResponse.json(
      ApiResponse.success({ userId: user.id, username }, 'User created successfully'),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to create user'), { status: 500 });
  }
}

// GET /api/hospital?action=users
async function getUsers(req) {
  try {
    const check = await checkHospitalAdmin(req);
    if (check.error) return check.error;

    const adminUser = await prisma.user.findUnique({ where: { id: check.user.id } });
    const { searchParams } = new URL(req.url);
    const { page, limit, search, status, sortBy, sortOrder } = parseQueryParams(searchParams);

    const where = buildWhereClause(
      search,
      ['firstName', 'lastName', 'email', 'username'],
      {
        tenantId: adminUser.tenantId,
        ...(status && { status }),
      }
    );

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        phone: true,
        department: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
        lastLoginAt: true,
        roles: { select: { name: true } },
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(users, pagination, 'Users fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch users'), { status: 500 });
  }
}

// PATCH /api/hospital?action=force-password-change&id=xxx
async function forcePasswordChange(req) {
  try {
    const check = await checkHospitalAdmin(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(ApiResponse.error('User ID required', 400), { status: 400 });
    }

    const adminUser = await prisma.user.findUnique({ where: { id: check.user.id } });

    const user = await prisma.user.update({
      where: { id: userId, tenantId: adminUser.tenantId },
      data: { mustChangePassword: true },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    return NextResponse.json(ApiResponse.success(null, 'Password change forced. User sessions cleared.'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to force password change'), { status: 500 });
  }
}

// POST /api/hospital?action=reset-password (authenticated user)
async function resetPassword(req) {
  try {
    const check = await checkHospitalAdmin(req);
    if (check.error) return check.error;

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(ApiResponse.error('Old and new passwords required', 400), { status: 400 });
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(ApiResponse.error('Invalid password', 400, validation.errors), { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: check.user.id } });

    if (!(await comparePassword(oldPassword, user.password))) {
      return NextResponse.json(ApiResponse.error('Incorrect old password', 401), { status: 401 });
    }

    if (!(await checkPasswordHistory(user.id, newPassword))) {
      return NextResponse.json(
        ApiResponse.error('Password cannot be same as last 3 passwords', 400),
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    await prisma.passwordHistory.create({
      data: { userId: user.id, passwordHash: hashedPassword },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    return NextResponse.json(ApiResponse.success(null, 'Password reset successfully. Please login again.'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to reset password'), { status: 500 });
  }
}

// POST /api/hospital?action=forgot-password
async function forgotPassword(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(ApiResponse.error('Email required', 400), { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(ApiResponse.success(null, 'If email exists, reset link sent.'));
    }

    await prisma.passwordReset.updateMany({
      where: { userId: user.id, isUsed: false },
      data: { isUsed: true },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json(ApiResponse.success(null, 'If email exists, reset link sent.'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to process request'), { status: 500 });
  }
}

// POST /api/hospital?action=reset-password-with-token
async function resetPasswordWithToken(req) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(ApiResponse.error('Token and new password required', 400), { status: 400 });
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(ApiResponse.error('Invalid password', 400, validation.errors), { status: 400 });
    }

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.isUsed || new Date() > resetRecord.expiresAt) {
      return NextResponse.json(ApiResponse.error('Invalid or expired token', 400), { status: 400 });
    }

    if (!(await checkPasswordHistory(resetRecord.userId, newPassword))) {
      return NextResponse.json(
        ApiResponse.error('Password cannot be same as last 3 passwords', 400),
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    await prisma.passwordHistory.create({
      data: { userId: resetRecord.userId, passwordHash: hashedPassword },
    });

    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    await prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    return NextResponse.json(ApiResponse.success(null, 'Password reset successfully.'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to reset password'), { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'users') return getUsers(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'create-user') return createUser(req);
  if (action === 'reset-password') return resetPassword(req);
  if (action === 'forgot-password') return forgotPassword(req);
  if (action === 'reset-password-with-token') return resetPasswordWithToken(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}

export async function PATCH(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'force-password-change') return forcePasswordChange(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}
