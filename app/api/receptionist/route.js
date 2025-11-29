// app/api/receptionist/route.js
import { NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiResponse, parseQueryParams, buildPagination, buildWhereClause, handleApiError } from '@/lib/utils';

async function checkReceptionist(req) {
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return { error: NextResponse.json(ApiResponse.error(auth.error, auth.status), { status: auth.status }) };
  }

  if (!requireRole(auth.user.roles, 'RECEPTIONIST')) {
    return { error: NextResponse.json(ApiResponse.error('Access denied. Receptionist only.', 403), { status: 403 }) };
  }

  return { user: auth.user };
}

async function generatePatientId(hospitalId) {
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { name: true },
  });

  if (!hospital) throw new Error('Hospital not found');

  const hospitalCode = hospital.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  const patientCount = await prisma.patient.count({
    where: { hospitalId },
  });

  const sequentialNumber = (patientCount + 1).toString().padStart(4, '0');

  return `${hospitalCode}-P-${sequentialNumber}`;
}

// POST /api/receptionist?action=register-patient
async function registerPatient(req) {
  try {
    const check = await checkReceptionist(req);
    if (check.error) return check.error;

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      patientType,
      departmentId,
      photoUrl,
    } = await req.json();

    if (!firstName || !lastName || !dateOfBirth || !gender || !phone || !emergencyContactName || !emergencyContactPhone || !patientType) {
      return NextResponse.json(ApiResponse.error('Required fields missing', 400), { status: 400 });
    }

    const receptionist = await prisma.user.findUnique({
      where: { id: check.user.id },
      include: { hospital: true },
    });

    if (!receptionist || !receptionist.hospital) {
      return NextResponse.json(ApiResponse.error('Hospital not found', 404), { status: 404 });
    }

    const patientId = await generatePatientId(receptionist.hospitalId);

    const patient = await prisma.patient.create({
      data: {
        tenantId: receptionist.tenantId,
        hospitalId: receptionist.hospitalId,
        patientId,
        firstName,
        lastName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodGroup,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation,
        patientType,
        departmentId,
        photoUrl,
        createdById: receptionist.id,
      },
    });

    return NextResponse.json(
      ApiResponse.success(patient, 'Patient registered successfully'),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to register patient'), { status: 500 });
  }
}

// PUT /api/receptionist?action=update-patient
async function updatePatient(req) {
  try {
    const check = await checkReceptionist(req);
    if (check.error) return check.error;

    const { patientId, phone, email, address, city, state, pincode, photoUrl } = await req.json();

    if (!patientId) {
      return NextResponse.json(ApiResponse.error('Patient ID required', 400), { status: 400 });
    }

    const receptionist = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: receptionist.tenantId },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Patient not found', 404), { status: 404 });
    }

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ...(phone && { phone }),
        ...(email && { email }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(pincode && { pincode }),
        ...(photoUrl && { photoUrl }),
      },
    });

    return NextResponse.json(ApiResponse.success(updated, 'Patient updated successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to update patient'), { status: 500 });
  }
}

// GET /api/receptionist?action=patients
async function getPatients(req) {
  try {
    const check = await checkReceptionist(req);
    if (check.error) return check.error;

    const receptionist = await prisma.user.findUnique({ where: { id: check.user.id } });
    const { searchParams } = new URL(req.url);
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(searchParams);
    
    const patientType = searchParams.get('patientType') || '';

    const where = buildWhereClause(
      search,
      ['firstName', 'lastName', 'patientId', 'phone', 'email'],
      {
        tenantId: receptionist.tenantId,
        ...(patientType && { patientType }),
      }
    );

    const total = await prisma.patient.count({ where });

    const patients = await prisma.patient.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        department: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(patients, pagination, 'Patients fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch patients'), { status: 500 });
  }
}

// GET /api/receptionist?action=patient&id=xxx
async function getPatient(req) {
  try {
    const check = await checkReceptionist(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Patient ID required', 400), { status: 400 });
    }

    const receptionist = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id, tenantId: receptionist.tenantId },
      include: {
        department: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Patient not found', 404), { status: 404 });
    }

    return NextResponse.json(ApiResponse.success(patient, 'Patient fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch patient'), { status: 500 });
  }
}

// GET /api/receptionist?action=dashboard-stats
async function getDashboardStats(req) {
  try {
    const check = await checkReceptionist(req);
    if (check.error) return check.error;

    const receptionist = await prisma.user.findUnique({ where: { id: check.user.id } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalPatients, patientsToday, opdPatients, ipdPatients] = await Promise.all([
      prisma.patient.count({ where: { tenantId: receptionist.tenantId } }),
      prisma.patient.count({
        where: { tenantId: receptionist.tenantId, createdAt: { gte: today } },
      }),
      prisma.patient.count({
        where: { tenantId: receptionist.tenantId, patientType: 'OPD' },
      }),
      prisma.patient.count({
        where: { tenantId: receptionist.tenantId, patientType: 'IPD' },
      }),
    ]);

    return NextResponse.json(
      ApiResponse.success(
        {
          totalPatients,
          patientsToday,
          opdPatients,
          ipdPatients,
        },
        'Dashboard stats fetched successfully'
      )
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch stats'), { status: 500 });
  }
}

// POST /api/receptionist?action=reset-password
async function resetPassword(req) {
  try {
    const check = await checkReceptionist(req);
    if (check.error) return check.error;

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(ApiResponse.error('Old and new passwords required', 400), { status: 400 });
    }

    const { validatePassword, comparePassword, hashPassword } = await import('@/lib/auth');
    
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return NextResponse.json(ApiResponse.error('Invalid password', 400, validation.errors), { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: check.user.id } });

    if (!(await comparePassword(oldPassword, user.password))) {
      return NextResponse.json(ApiResponse.error('Incorrect old password', 401), { status: 401 });
    }

    // Check password history
    const history = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    for (const record of history) {
      if (await comparePassword(newPassword, record.passwordHash)) {
        return NextResponse.json(
          ApiResponse.error('Password cannot be same as last 3 passwords', 400),
          { status: 400 }
        );
      }
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

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'patients') return getPatients(req);
  if (action === 'patient') return getPatient(req);
  if (action === 'dashboard-stats') return getDashboardStats(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'register-patient') return registerPatient(req);
  if (action === 'reset-password') return resetPassword(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}

export async function PUT(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'update-patient') return updatePatient(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}
