// app/api/nurse/route.js
import { NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiResponse, parseQueryParams, buildPagination, buildWhereClause, handleApiError } from '@/lib/utils';

async function checkNurse(req) {
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return { error: NextResponse.json(ApiResponse.error(auth.error, auth.status), { status: auth.status }) };
  }

  if (!requireRole(auth.user.roles, 'NURSE')) {
    return { error: NextResponse.json(ApiResponse.error('Access denied. Nurse only.', 403), { status: 403 }) };
  }

  return { user: auth.user };
}

// GET /api/nurse?action=assigned-patients
async function getAssignedPatients(req) {
  try {
    const check = await checkNurse(req);
    if (check.error) return check.error;

    const nurse = await prisma.user.findUnique({ where: { id: check.user.id } });
    const { searchParams } = new URL(req.url);
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(searchParams);
    
    const patientType = searchParams.get('patientType') || '';
    const isDischarged = searchParams.get('isDischarged') || '';

    const where = buildWhereClause(
      search,
      ['firstName', 'lastName', 'patientId', 'phone'],
      {
        tenantId: nurse.tenantId,
        ...(patientType && { patientType }),
        ...(isDischarged !== '' && { isDischarged: isDischarged === 'true' }),
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
        vitals: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
        dischargedByUser: { select: { firstName: true, lastName: true } }, // ✅ REMOVED employeeId
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(patients, pagination, 'Patients fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch patients'), { status: 500 });
  }
}

// GET /api/nurse?action=patient&id=xxx
async function getPatient(req) {
  try {
    const check = await checkNurse(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Patient ID required', 400), { status: 400 });
    }

    const nurse = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id, tenantId: nurse.tenantId },
      include: {
        department: true,
        vitals: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
          include: {
            recordedBy: { select: { firstName: true, lastName: true } }, // ✅ REMOVED employeeId
          },
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            doctor: { select: { firstName: true, lastName: true, specialization: true } }, // ✅ REMOVED employeeId
          },
        },
        careNotes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            nurse: { select: { firstName: true, lastName: true } }, // ✅ REMOVED employeeId
          },
        },
        dischargedByUser: { select: { firstName: true, lastName: true } }, // ✅ REMOVED employeeId
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

// POST /api/nurse?action=record-vitals
async function recordVitals(req) {
  try {
    const check = await checkNurse(req);
    if (check.error) return check.error;

    const {
      patientId,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      temperature,
      pulse,
      spO2,
      weight,
      notes,
    } = await req.json();

    if (!patientId) {
      return NextResponse.json(ApiResponse.error('Patient ID required', 400), { status: 400 });
    }

    const nurse = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: nurse.tenantId },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Patient not found', 404), { status: 404 });
    }

    // ✅ Check if patient is discharged
    if (patient.isDischarged) {
      return NextResponse.json(ApiResponse.error('Cannot record vitals for discharged patient', 400), { status: 400 });
    }

    const vitals = await prisma.vital.create({
      data: {
        tenantId: nurse.tenantId,
        patientId: patient.id,
        bloodPressureSystolic: bloodPressureSystolic ? parseFloat(bloodPressureSystolic) : null,
        bloodPressureDiastolic: bloodPressureDiastolic ? parseFloat(bloodPressureDiastolic) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        pulse: pulse ? parseInt(pulse) : null,
        spO2: spO2 ? parseFloat(spO2) : null,
        weight: weight ? parseFloat(weight) : null,
        notes,
        recordedById: nurse.id,
        recordedAt: new Date(),
      },
    });

    return NextResponse.json(
      ApiResponse.success(vitals, 'Vitals recorded successfully'),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to record vitals'), { status: 500 });
  }
}

// POST /api/nurse?action=add-care-note
async function addCareNote(req) {
  try {
    const check = await checkNurse(req);
    if (check.error) return check.error;

    const { patientId, note } = await req.json();

    if (!patientId || !note) {
      return NextResponse.json(ApiResponse.error('Patient ID and note required', 400), { status: 400 });
    }

    const nurse = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: nurse.tenantId },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Patient not found', 404), { status: 404 });
    }

    // ✅ Check if patient is discharged
    if (patient.isDischarged) {
      return NextResponse.json(ApiResponse.error('Cannot add care note for discharged patient', 400), { status: 400 });
    }

    const careNote = await prisma.careNote.create({
      data: {
        tenantId: nurse.tenantId,
        patientId: patient.id,
        nurseId: nurse.id,
        note,
      },
    });

    return NextResponse.json(
      ApiResponse.success(careNote, 'Care note added successfully'),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to add care note'), { status: 500 });
  }
}

// ✅ GET /api/nurse?action=prescriptions (view all prescriptions)
async function getAllPrescriptions(req) {
  try {
    const check = await checkNurse(req);
    if (check.error) return check.error;

    const nurse = await prisma.user.findUnique({ where: { id: check.user.id } });
    const { searchParams } = new URL(req.url);
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(searchParams);

    const patientId = searchParams.get('patientId') || '';
    const isDispensed = searchParams.get('isDispensed') || '';

    const where = {
      tenantId: nurse.tenantId,
      ...(patientId && { patientId }),
      ...(isDispensed !== '' && { isDispensed: isDispensed === 'true' }),
    };

    // Add search functionality
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
        doctor: { select: { firstName: true, lastName: true, specialization: true } }, // ✅ REMOVED employeeId
        patient: { select: { firstName: true, lastName: true, patientId: true, isDischarged: true } },
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(prescriptions, pagination, 'Prescriptions fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch prescriptions'), { status: 500 });
  }
}

// ✅ GET /api/nurse?action=prescription&id=xxx (get single prescription details)
async function getPrescription(req) {
  try {
    const check = await checkNurse(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Prescription ID required', 400), { status: 400 });
    }

    const nurse = await prisma.user.findUnique({ where: { id: check.user.id } });

    const prescription = await prisma.prescription.findFirst({
      where: { id, tenantId: nurse.tenantId },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } }, // ✅ REMOVED employeeId
        patient: { 
          select: { 
            firstName: true, 
            lastName: true, 
            patientId: true, 
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            isDischarged: true 
          } 
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

// GET /api/nurse?action=dashboard-stats
async function getDashboardStats(req) {
  try {
    const check = await checkNurse(req);
    if (check.error) return check.error;

    const nurse = await prisma.user.findUnique({ where: { id: check.user.id } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPatients, 
      opdPatients, 
      ipdPatients, 
      vitalsToday, 
      careNotesToday,
      activePatients,
      dischargedPatients,
      pendingPrescriptions
    ] = await Promise.all([
      prisma.patient.count({ where: { tenantId: nurse.tenantId } }),
      prisma.patient.count({ where: { tenantId: nurse.tenantId, patientType: 'OPD', isDischarged: false } }),
      prisma.patient.count({ where: { tenantId: nurse.tenantId, patientType: 'IPD', isDischarged: false } }),
      prisma.vital.count({
        where: { recordedById: nurse.id, recordedAt: { gte: today } },
      }),
      prisma.careNote.count({
        where: { nurseId: nurse.id, createdAt: { gte: today } },
      }),
      prisma.patient.count({ where: { tenantId: nurse.tenantId, isDischarged: false } }),
      prisma.patient.count({ where: { tenantId: nurse.tenantId, isDischarged: true } }),
      prisma.prescription.count({ where: { tenantId: nurse.tenantId, isDispensed: false } }),
    ]);

    return NextResponse.json(
      ApiResponse.success(
        {
          totalPatients,
          opdPatients,
          ipdPatients,
          vitalsToday,
          careNotesToday,
          activePatients,
          dischargedPatients,
          pendingPrescriptions,
        },
        'Dashboard stats fetched successfully'
      )
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch stats'), { status: 500 });
  }
}

// POST /api/nurse?action=reset-password
async function resetPassword(req) {
  try {
    const check = await checkNurse(req);
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

  if (action === 'assigned-patients') return getAssignedPatients(req);
  if (action === 'patient') return getPatient(req);
  if (action === 'prescriptions') return getAllPrescriptions(req);
  if (action === 'prescription') return getPrescription(req);
  if (action === 'dashboard-stats') return getDashboardStats(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'record-vitals') return recordVitals(req);
  if (action === 'add-care-note') return addCareNote(req);
  if (action === 'reset-password') return resetPassword(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}
