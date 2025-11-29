// app/api/pharmacist/route.js
import { NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiResponse, parseQueryParams, buildPagination, buildWhereClause, handleApiError } from '@/lib/utils';

async function checkPharmacist(req) {
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return { error: NextResponse.json(ApiResponse.error(auth.error, auth.status), { status: auth.status }) };
  }

  if (!requireRole(auth.user.roles, 'PHARMACIST')) {
    return { error: NextResponse.json(ApiResponse.error('Access denied. Pharmacist only.', 403), { status: 403 }) };
  }

  return { user: auth.user };
}

// GET /api/pharmacist?action=prescriptions
async function getPrescriptions(req) {
  try {
    const check = await checkPharmacist(req);
    if (check.error) return check.error;

    const pharmacist = await prisma.user.findUnique({ where: { id: check.user.id } });
    const { searchParams } = new URL(req.url);
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(searchParams);
    
    const status = searchParams.get('status') || ''; // pending, dispensed, all

    let where = {
      tenantId: pharmacist.tenantId,
    };

    // Filter by dispensed status
    if (status === 'pending') {
      where.isDispensed = false;
    } else if (status === 'dispensed') {
      where.isDispensed = true;
    }

    // Search by patient name or prescription ID
    if (search) {
      where.OR = [
        { prescriptionId: { contains: search, mode: 'insensitive' } },
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { patientId: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const total = await prisma.prescription.count({ where });

    const prescriptions = await prisma.prescription.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            patientId: true,
            phone: true,
            email: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(prescriptions, pagination, 'Prescriptions fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch prescriptions'), { status: 500 });
  }
}

// GET /api/pharmacist?action=prescription&id=xxx
async function getPrescription(req) {
  try {
    const check = await checkPharmacist(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Prescription ID required', 400), { status: 400 });
    }

    const pharmacist = await prisma.user.findUnique({ where: { id: check.user.id } });

    const prescription = await prisma.prescription.findFirst({
      where: { id, tenantId: pharmacist.tenantId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            patientId: true,
            phone: true,
            email: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
            phone: true,
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(ApiResponse.error('Prescription not found', 404), { status: 404 });
    }

    return NextResponse.json(ApiResponse.success(prescription, 'Prescription fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch prescription'), { status: 500 });
  }
}

// POST /api/pharmacist?action=dispense-prescription
async function dispensePrescription(req) {
  try {
    const check = await checkPharmacist(req);
    if (check.error) return check.error;

    const { prescriptionId } = await req.json();

    if (!prescriptionId) {
      return NextResponse.json(ApiResponse.error('Prescription ID required', 400), { status: 400 });
    }

    const pharmacist = await prisma.user.findUnique({ where: { id: check.user.id } });

    const prescription = await prisma.prescription.findFirst({
      where: { id: prescriptionId, tenantId: pharmacist.tenantId },
    });

    if (!prescription) {
      return NextResponse.json(ApiResponse.error('Prescription not found', 404), { status: 404 });
    }

    if (prescription.isDispensed) {
      return NextResponse.json(ApiResponse.error('Prescription already dispensed', 400), { status: 400 });
    }

    const updated = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        isDispensed: true,
        dispensedAt: new Date(),
      },
      include: {
        patient: { select: { firstName: true, lastName: true, patientId: true } },
      },
    });

    return NextResponse.json(
      ApiResponse.success(updated, 'Prescription marked as dispensed'),
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to dispense prescription'), { status: 500 });
  }
}

// GET /api/pharmacist?action=dashboard-stats
async function getDashboardStats(req) {
  try {
    const check = await checkPharmacist(req);
    if (check.error) return check.error;

    const pharmacist = await prisma.user.findUnique({ where: { id: check.user.id } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const [
      totalPrescriptions,
      pendingPrescriptions,
      dispensedToday,
      dispensedThisWeek,
      totalDispensed,
    ] = await Promise.all([
      prisma.prescription.count({ where: { tenantId: pharmacist.tenantId } }),
      prisma.prescription.count({
        where: { tenantId: pharmacist.tenantId, isDispensed: false },
      }),
      prisma.prescription.count({
        where: {
          tenantId: pharmacist.tenantId,
          isDispensed: true,
          dispensedAt: { gte: today },
        },
      }),
      prisma.prescription.count({
        where: {
          tenantId: pharmacist.tenantId,
          isDispensed: true,
          dispensedAt: { gte: weekAgo },
        },
      }),
      prisma.prescription.count({
        where: { tenantId: pharmacist.tenantId, isDispensed: true },
      }),
    ]);

    return NextResponse.json(
      ApiResponse.success(
        {
          totalPrescriptions,
          pendingPrescriptions,
          dispensedToday,
          dispensedThisWeek,
          totalDispensed,
        },
        'Dashboard stats fetched successfully'
      )
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch stats'), { status: 500 });
  }
}

// POST /api/pharmacist?action=reset-password
async function resetPassword(req) {
  try {
    const check = await checkPharmacist(req);
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

  if (action === 'prescriptions') return getPrescriptions(req);
  if (action === 'prescription') return getPrescription(req);
  if (action === 'dashboard-stats') return getDashboardStats(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'dispense-prescription') return dispensePrescription(req);
  if (action === 'reset-password') return resetPassword(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}
