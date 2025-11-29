import { NextResponse } from 'next/server';
import {
  authenticate,
  comparePassword,
  generateTokens,
  verifyRefreshToken,
  hashPassword,
  revokeRefreshToken,
  generateAccessToken,
} from '@/lib/auth';
import { db, prisma } from '@/lib/db';
import { ApiResponse, schemas, handleApiError } from '@/lib/utils';
import { sendOtpEmail } from '@/lib/email';

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

function generateTenantId(hospitalName) {
  const code = hospitalName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
  
  const uniqueId = Math.floor(1000 + Math.random() * 9000);
  
  return `${code}${uniqueId}`;
}

function extractDomain(website) {
  try {
    const url = website.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    const domainMatch = url.match(/^[^\\/]+/);
    if (!domainMatch) return null;
    const domain = domainMatch[0].toLowerCase();
    return /^[a-z0-9]+([\-\.][a-z0-9]+)*\.[a-z]{2,}$/i.test(domain) ? domain : null;
  } catch {
    return null;
  }
}

async function handleSendHospitalOtp(req) {
  try {
    const { adminEmail } = await req.json();
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return NextResponse.json(ApiResponse.error('Valid admin email required', 400), { status: 400 });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailOtp.updateMany({
      where: { email: adminEmail, purpose: 'HOSPITAL_REGISTRATION', isUsed: false },
      data: { isUsed: true },
    });

    await prisma.emailOtp.create({
      data: { email: adminEmail, code, purpose: 'HOSPITAL_REGISTRATION', expiresAt },
    });

    await sendOtpEmail(adminEmail, code);

    return NextResponse.json(ApiResponse.success(null, 'Verification code sent'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to send code'), { status: 500 });
  }
}

async function handleRegisterHospital(req) {
  try {
    const {
      hospitalName, address, email, phone, licenseNumber, domain,
      firstName, lastName, adminEmail, adminPhone, password, otpCode,
    } = await req.json();

    if (!hospitalName || !address || !email || !phone || !licenseNumber || !domain || 
        !firstName || !lastName || !adminEmail || !adminPhone || !password || !otpCode) {
      return NextResponse.json(ApiResponse.error('All fields required', 400), { status: 400 });
    }

    const cleanDomain = extractDomain(domain);
    if (!cleanDomain) {
      return NextResponse.json(ApiResponse.error('Invalid domain format', 400), { status: 400 });
    }

    const adminUsername = `admin@${cleanDomain}`;

    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        email: adminEmail,
        purpose: 'HOSPITAL_REGISTRATION',
        code: otpCode,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (!otpRecord) {
      return NextResponse.json(ApiResponse.error('Invalid/expired OTP', 400), { status: 400 });
    }

    await prisma.emailOtp.update({ where: { id: otpRecord.id }, data: { isUsed: true } });

    if (await prisma.hospital.findUnique({ where: { email } })) {
      return NextResponse.json(ApiResponse.error('Hospital email exists', 409), { status: 409 });
    }
    if (await prisma.hospital.findUnique({ where: { licenseNumber } })) {
      return NextResponse.json(ApiResponse.error('License exists', 409), { status: 409 });
    }
    if (await prisma.hospital.findUnique({ where: { domain: cleanDomain } })) {
      return NextResponse.json(ApiResponse.error('Domain exists', 409), { status: 409 });
    }
    if (await prisma.user.findFirst({ where: { OR: [{ email: adminEmail }, { username: adminUsername }] } })) {
      return NextResponse.json(ApiResponse.error('Admin exists', 409), { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const hospitalAdminRole = await prisma.role.findUnique({ where: { name: 'HOSPITAL_ADMIN' } });
    if (!hospitalAdminRole) {
      return NextResponse.json(ApiResponse.error('Role not found', 500), { status: 500 });
    }

    const tenantId = generateTenantId(hospitalName);

    const { hospital } = await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
        data: {
          tenantId,
          name: hospitalName, 
          address, 
          email, 
          phone, 
          licenseNumber, 
          domain: cleanDomain,
          status: 'PENDING', 
          isEmailVerified: true,
        },
      });
      await tx.user.create({
        data: {
          tenantId: hospital.tenantId,
          hospitalId: hospital.id,
          firstName, 
          lastName, 
          email: adminEmail, 
          phone: adminPhone,
          username: adminUsername, 
          password: hashedPassword,
          status: 'ACTIVE', 
          isEmailVerified: true, 
          mustChangePassword: false,
          roleIds: [hospitalAdminRole.id],
        },
      });
      return { hospital };
    });

    return NextResponse.json(
      ApiResponse.success({
        hospitalId: hospital.id,
        tenantId: hospital.tenantId,
        adminUsername,
        message: 'Hospital registered. Awaiting Super Admin approval.',
      }),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Registration failed'), { status: 500 });
  }
}

async function handleLogin(req) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(ApiResponse.error('Identifier and password required', 400), { status: 400 });
    }

    // Try to find user by username first, then email
    let user = await prisma.user.findFirst({
      where: { username: identifier },
      include: { roles: { include: { permissions: true } } },
    });

    // If not found by username, try email
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: identifier },
        include: { roles: { include: { permissions: true } } },
      });
    }
    
    if (!user || !(await comparePassword(password, user.password)) || user.status !== 'ACTIVE') {
      return NextResponse.json(ApiResponse.error('Invalid credentials', 401), { status: 401 });
    }

    const permissions = [];
    user.roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        if (!permissions.includes(permission.code)) permissions.push(permission.code);
      });
    });

    const roles = user.roles.map((r) => r.name);
    const { accessToken, refreshToken } = await generateTokens(user, roles, permissions);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(ApiResponse.success({
      user: { ...userWithoutPassword, roles, permissions },
      accessToken, refreshToken,
    }));
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}


async function handleRefresh(req) {
  try {
    const { refreshToken } = schemas.refreshToken.parse(await req.json());
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) return NextResponse.json(ApiResponse.error('Invalid token', 401), { status: 401 });

    const tokenRecord = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!tokenRecord || tokenRecord.isRevoked || new Date() > tokenRecord.expiresAt) {
      return NextResponse.json(ApiResponse.error('Token invalid/expired', 401), { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { roles: { include: { permissions: true } } },
    });
    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json(ApiResponse.error('User inactive', 401), { status: 401 });
    }

    const permissions = [];
    user.roles.forEach((role) => {
      role.permissions.forEach((permission) => {
        if (!permissions.includes(permission.code)) permissions.push(permission.code);
      });
    });

    const accessToken = generateAccessToken({
      userId: user.id, email: user.email, tenantId: user.tenantId,
      roles: user.roles.map((r) => r.name), permissions,
    });

    return NextResponse.json(ApiResponse.success({ accessToken }));
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}

async function handleLogout(req) {
  try {
    const auth = await authenticate(req);
    if (!auth.authenticated) {
      return NextResponse.json(ApiResponse.error(auth.error, auth.status), { status: auth.status });
    }
    const { refreshToken } = await req.json();
    if (refreshToken) await revokeRefreshToken(refreshToken);
    return NextResponse.json(ApiResponse.success(null, 'Logged out'));
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 });
  }
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  
  const handlers = {
    login: handleLogin,
    'send-hospital-otp': handleSendHospitalOtp,
    'register-hospital': handleRegisterHospital,
    refresh: handleRefresh,
    logout: handleLogout,
  };
  
  return handlers[action]?.(req) ?? NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}
