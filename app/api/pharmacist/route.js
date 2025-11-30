// app/api/pharmacist/route.js
import { NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiResponse, parseQueryParams, buildPagination, handleApiError } from '@/lib/utils';

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

// ✅ FIXED: GET /api/pharmacist?action=prescriptions (only active patients)
async function getPrescriptions(req) {
  try {
    const check = await checkPharmacist(req);
    if (check.error) return check.error;

    const pharmacist = await prisma.user.findUnique({ where: { id: check.user.id } });
    const { searchParams } = new URL(req.url);
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(searchParams);
    
    const status = searchParams.get('status') || '';

    let where = {
      tenantId: pharmacist.tenantId,
    };

    if (status === 'pending') {
      where.isDispensed = false;
    } else if (status === 'dispensed') {
      where.isDispensed = true;
    }

    if (search) {
      where.OR = [
        { prescriptionId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const prescriptions = await prisma.prescription.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit * 2, // ✅ Fetch extra to account for deleted patients
      orderBy: { [sortBy]: sortOrder },
    });

    // ✅ Manually fetch related data
    const enrichedPrescriptions = await Promise.all(
      prescriptions.map(async (rx) => {
        try {
          const patient = await prisma.patient.findUnique({
            where: { id: rx.patientId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              patientId: true,
              phone: true,
              email: true,
            },
          });

          const doctor = await prisma.user.findUnique({
            where: { id: rx.doctorId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true,
            },
          });

          return {
            ...rx,
            patient: patient || null,
            doctor: doctor || null,
          };
        } catch (err) {
          console.error('Error enriching prescription:', err);
          return {
            ...rx,
            patient: null,
            doctor: null,
          };
        }
      })
    );

    // ✅ Filter out prescriptions where patient doesn't exist
    const validPrescriptions = enrichedPrescriptions
      .filter(p => p.patient !== null)
      .slice(0, limit); // ✅ Limit to requested page size

    // ✅ Count only prescriptions with existing patients
    const allPrescriptionsForCount = await prisma.prescription.findMany({
      where,
      select: { id: true, patientId: true },
    });

    const validCount = await Promise.all(
      allPrescriptionsForCount.map(async (rx) => {
        const patient = await prisma.patient.findUnique({
          where: { id: rx.patientId },
          select: { id: true },
        });
        return patient !== null;
      })
    );

    const total = validCount.filter(Boolean).length;

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(validPrescriptions, pagination, 'Prescriptions fetched successfully'));
  } catch (error) {
    console.error('Pharmacist prescriptions error:', error);
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
      where: { 
        id, 
        tenantId: pharmacist.tenantId,
      },
    });

    if (!prescription) {
      return NextResponse.json(ApiResponse.error('Prescription not found', 404), { status: 404 });
    }

    // ✅ Fetch patient
    const patient = await prisma.patient.findUnique({
      where: { id: prescription.patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        patientId: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        gender: true,
      },
    });

    // ✅ Don't show prescription if patient doesn't exist
    if (!patient) {
      return NextResponse.json(ApiResponse.error('Prescription patient not found', 404), { status: 404 });
    }

    const doctor = await prisma.user.findUnique({
      where: { id: prescription.doctorId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        specialization: true,
        phone: true,
      },
    });

    const enrichedPrescription = {
      ...prescription,
      patient,
      doctor: doctor || {
        id: 'unknown',
        firstName: 'Dr.',
        lastName: '[Unknown]',
        specialization: 'N/A',
        phone: 'N/A',
      },
    };

    return NextResponse.json(ApiResponse.success(enrichedPrescription, 'Prescription fetched successfully'));
  } catch (error) {
    console.error('Pharmacist prescription detail error:', error);
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
      where: { 
        id: prescriptionId, 
        tenantId: pharmacist.tenantId,
      },
    });

    if (!prescription) {
      return NextResponse.json(ApiResponse.error('Prescription not found', 404), { status: 404 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: prescription.patientId },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Cannot dispense: Patient not found', 404), { status: 404 });
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
    });

    const enrichedUpdated = {
      ...updated,
      patient: { 
        firstName: patient.firstName, 
        lastName: patient.lastName, 
        patientId: patient.patientId 
      },
    };

    return NextResponse.json(
      ApiResponse.success(enrichedUpdated, 'Prescription marked as dispensed'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Dispense prescription error:', error);
    return NextResponse.json(handleApiError(error, 'Failed to dispense prescription'), { status: 500 });
  }
}

// ✅ FIXED: GET /api/pharmacist?action=dashboard-stats (only count active patients)
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

    const baseWhere = {
      tenantId: pharmacist.tenantId,
    };

    // ✅ Fetch all prescriptions and filter by existing patients
    const [
      allPrescriptions,
      pendingPrescriptions,
      dispensedTodayPrescriptions,
      dispensedThisWeekPrescriptions,
      dispensedPrescriptions,
    ] = await Promise.all([
      prisma.prescription.findMany({ 
        where: baseWhere,
        select: { id: true, patientId: true },
      }),
      prisma.prescription.findMany({
        where: { ...baseWhere, isDispensed: false },
        select: { id: true, patientId: true },
      }),
      prisma.prescription.findMany({
        where: {
          ...baseWhere,
          isDispensed: true,
          dispensedAt: { gte: today },
        },
        select: { id: true, patientId: true },
      }),
      prisma.prescription.findMany({
        where: {
          ...baseWhere,
          isDispensed: true,
          dispensedAt: { gte: weekAgo },
        },
        select: { id: true, patientId: true },
      }),
      prisma.prescription.findMany({
        where: { ...baseWhere, isDispensed: true },
        select: { id: true, patientId: true },
      }),
    ]);

    // ✅ Helper function to count prescriptions with existing patients
    const countValidPrescriptions = async (prescriptions) => {
      const validChecks = await Promise.all(
        prescriptions.map(async (rx) => {
          const patient = await prisma.patient.findUnique({
            where: { id: rx.patientId },
            select: { id: true },
          });
          return patient !== null;
        })
      );
      return validChecks.filter(Boolean).length;
    };

    const [
      totalPrescriptions,
      pendingCount,
      dispensedToday,
      dispensedThisWeek,
      totalDispensed,
    ] = await Promise.all([
      countValidPrescriptions(allPrescriptions),
      countValidPrescriptions(pendingPrescriptions),
      countValidPrescriptions(dispensedTodayPrescriptions),
      countValidPrescriptions(dispensedThisWeekPrescriptions),
      countValidPrescriptions(dispensedPrescriptions),
    ]);

    return NextResponse.json(
      ApiResponse.success(
        {
          totalPrescriptions,
          pendingPrescriptions: pendingCount,
          dispensedToday,
          dispensedThisWeek,
          totalDispensed,
        },
        'Dashboard stats fetched successfully'
      )
    );
  } catch (error) {
    console.error('Dashboard stats error:', error);
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
    console.error('Reset password error:', error);
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
