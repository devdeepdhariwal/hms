// app/api/doctor/route.js
import { NextResponse } from 'next/server';
import { authenticate, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiResponse, parseQueryParams, buildPagination, buildWhereClause, handleApiError } from '@/lib/utils';

async function checkDoctor(req) {
  const auth = await authenticate(req);
  if (!auth.authenticated) {
    return { error: NextResponse.json(ApiResponse.error(auth.error, auth.status), { status: auth.status }) };
  }

  if (!requireRole(auth.user.roles, 'DOCTOR')) {
    return { error: NextResponse.json(ApiResponse.error('Access denied. Doctor only.', 403), { status: 403 }) };
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

async function generatePrescriptionId(hospitalId) {
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

  const prescriptionCount = await prisma.prescription.count({
    where: { hospitalId },
  });

  const sequentialNumber = (prescriptionCount + 1).toString().padStart(4, '0');

  return `${hospitalCode}-RX-${sequentialNumber}`;
}

// POST /api/doctor?action=register-patient
async function registerPatient(req) {
  try {
    const check = await checkDoctor(req);
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

    const doctor = await prisma.user.findUnique({
      where: { id: check.user.id },
      include: { hospital: true },
    });

    if (!doctor || !doctor.hospital) {
      return NextResponse.json(ApiResponse.error('Hospital not found', 404), { status: 404 });
    }

    const patientId = await generatePatientId(doctor.hospitalId);

    const patient = await prisma.patient.create({
      data: {
        tenantId: doctor.tenantId,
        hospitalId: doctor.hospitalId,
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
        createdById: doctor.id,
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

async function resetPassword(req) {
  try {
    const check = await checkDoctor(req);
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

// GET /api/doctor?action=patients
async function getPatients(req) {
  try {
    const check = await checkDoctor(req);
    if (check.error) return check.error;

    const doctor = await prisma.user.findUnique({ where: { id: check.user.id } });
    const { searchParams } = new URL(req.url);
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(searchParams);
    
    const patientType = searchParams.get('patientType') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const isDischarged = searchParams.get('isDischarged') || '';

    const where = buildWhereClause(
      search,
      ['firstName', 'lastName', 'patientId', 'phone', 'email'],
      {
        tenantId: doctor.tenantId,
        ...(patientType && { patientType }),
        ...(departmentId && { departmentId }),
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
        createdBy: { select: { firstName: true, lastName: true } },
        dischargedByUser: { select: { firstName: true, lastName: true } }, // ✅ REMOVED employeeId
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(patients, pagination, 'Patients fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch patients'), { status: 500 });
  }
}

// GET /api/doctor?action=patient&id=xxx
async function getPatient(req) {
  try {
    const check = await checkDoctor(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(ApiResponse.error('Patient ID required', 400), { status: 400 });
    }

    const doctor = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id, tenantId: doctor.tenantId },
      include: {
        department: true,
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: { select: { firstName: true, lastName: true, specialization: true } },
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

// ✅ GET /api/doctor?action=patient-vitals&patientId=xxx
async function getPatientVitals(req) {
  try {
    const check = await checkDoctor(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const { page, limit, sortBy, sortOrder } = parseQueryParams(searchParams);

    if (!patientId) {
      return NextResponse.json(ApiResponse.error('Patient ID required', 400), { status: 400 });
    }

    const doctor = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: doctor.tenantId },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Patient not found', 404), { status: 404 });
    }

    const where = { patientId };
    const total = await prisma.vital.count({ where });

    const vitals = await prisma.vital.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } }, // ✅ REMOVED employeeId
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(vitals, pagination, 'Patient vitals fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch vitals'), { status: 500 });
  }
}

// ✅ GET /api/doctor?action=patient-prescriptions&patientId=xxx (all prescriptions for a patient)
async function getPatientPrescriptions(req) {
  try {
    const check = await checkDoctor(req);
    if (check.error) return check.error;

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const { page, limit, sortBy, sortOrder } = parseQueryParams(searchParams);

    if (!patientId) {
      return NextResponse.json(ApiResponse.error('Patient ID required', 400), { status: 400 });
    }

    const doctor = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: doctor.tenantId },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Patient not found', 404), { status: 404 });
    }

    const where = { patientId, tenantId: doctor.tenantId };
    const total = await prisma.prescription.count({ where });

    const prescriptions = await prisma.prescription.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialization: true } }, // ✅ REMOVED employeeId
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(prescriptions, pagination, 'Patient prescriptions fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch prescriptions'), { status: 500 });
  }
}

// POST /api/doctor?action=create-prescription
async function createPrescription(req) {
  try {
    const check = await checkDoctor(req);
    if (check.error) return check.error;

    const { patientId, diagnosis, notes, medicines } = await req.json();

    if (!patientId || !medicines || medicines.length === 0) {
      return NextResponse.json(ApiResponse.error('Patient ID and medicines required', 400), { status: 400 });
    }

    const doctor = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: doctor.tenantId },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Patient not found', 404), { status: 404 });
    }

    // ✅ Check if patient is discharged
    if (patient.isDischarged) {
      return NextResponse.json(ApiResponse.error('Cannot create prescription for discharged patient', 400), { status: 400 });
    }

    const prescriptionId = await generatePrescriptionId(doctor.hospitalId);

    const prescription = await prisma.prescription.create({
      data: {
        tenantId: doctor.tenantId,
        hospitalId: doctor.hospitalId,
        prescriptionId,
        patientId: patient.id,
        doctorId: doctor.id,
        diagnosis,
        notes,
        medicines,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, patientId: true } },
      },
    });

    return NextResponse.json(
      ApiResponse.success(prescription, 'Prescription created successfully'),
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to create prescription'), { status: 500 });
  }
}

// GET /api/doctor?action=prescriptions
async function getPrescriptions(req) {
  try {
    const check = await checkDoctor(req);
    if (check.error) return check.error;

    const doctor = await prisma.user.findUnique({ where: { id: check.user.id } });
    const { searchParams } = new URL(req.url);
    const { page, limit, search, sortBy, sortOrder } = parseQueryParams(searchParams);

    const patientId = searchParams.get('patientId') || '';

    const where = {
      tenantId: doctor.tenantId,
      doctorId: doctor.id,
      ...(patientId && { patientId }),
    };

    const total = await prisma.prescription.count({ where });

    const prescriptions = await prisma.prescription.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        patient: { select: { firstName: true, lastName: true, patientId: true } },
      },
    });

    const pagination = buildPagination(page, limit, total);

    return NextResponse.json(ApiResponse.paginated(prescriptions, pagination, 'Prescriptions fetched successfully'));
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch prescriptions'), { status: 500 });
  }
}

// ✅ PATCH /api/doctor?action=discharge-patient
async function dischargePatient(req) {
  try {
    const check = await checkDoctor(req);
    if (check.error) return check.error;

    const { patientId, dischargeNotes } = await req.json();

    if (!patientId) {
      return NextResponse.json(ApiResponse.error('Patient ID required', 400), { status: 400 });
    }

    const doctor = await prisma.user.findUnique({ where: { id: check.user.id } });

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId: doctor.tenantId },
    });

    if (!patient) {
      return NextResponse.json(ApiResponse.error('Patient not found', 404), { status: 404 });
    }

    if (patient.isDischarged) {
      return NextResponse.json(ApiResponse.error('Patient already discharged', 400), { status: 400 });
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        isDischarged: true,
        dischargedAt: new Date(),
        dischargedBy: doctor.id,
        dischargeNotes,
      },
      include: {
        dischargedByUser: { select: { firstName: true, lastName: true } }, // ✅ REMOVED employeeId
      },
    });

    return NextResponse.json(
      ApiResponse.success(updatedPatient, 'Patient discharged successfully')
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to discharge patient'), { status: 500 });
  }
}

// GET /api/doctor?action=dashboard-stats
async function getDashboardStats(req) {
  try {
    const check = await checkDoctor(req);
    if (check.error) return check.error;

    const doctor = await prisma.user.findUnique({ where: { id: check.user.id } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPatients, 
      opdPatients, 
      ipdPatients, 
      todayPrescriptions, 
      totalPrescriptions,
      dischargedPatients,
      activePatients
    ] = await Promise.all([
      prisma.patient.count({ where: { tenantId: doctor.tenantId } }),
      prisma.patient.count({ where: { tenantId: doctor.tenantId, patientType: 'OPD', isDischarged: false } }),
      prisma.patient.count({ where: { tenantId: doctor.tenantId, patientType: 'IPD', isDischarged: false } }),
      prisma.prescription.count({
        where: { doctorId: doctor.id, createdAt: { gte: today } },
      }),
      prisma.prescription.count({ where: { doctorId: doctor.id } }),
      prisma.patient.count({ where: { tenantId: doctor.tenantId, isDischarged: true } }),
      prisma.patient.count({ where: { tenantId: doctor.tenantId, isDischarged: false } }),
    ]);

    return NextResponse.json(
      ApiResponse.success(
        {
          totalPatients,
          opdPatients,
          ipdPatients,
          todayPrescriptions,
          totalPrescriptions,
          dischargedPatients,
          activePatients,
        },
        'Dashboard stats fetched successfully'
      )
    );
  } catch (error) {
    return NextResponse.json(handleApiError(error, 'Failed to fetch stats'), { status: 500 });
  }
}

// ✅ ONLY ONE GET EXPORT
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'patients') return getPatients(req);
  if (action === 'patient') return getPatient(req);
  if (action === 'patient-vitals') return getPatientVitals(req);
  if (action === 'patient-prescriptions') return getPatientPrescriptions(req);
  if (action === 'prescriptions') return getPrescriptions(req);
  if (action === 'dashboard-stats') return getDashboardStats(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}

// ✅ ONLY ONE POST EXPORT
export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'register-patient') return registerPatient(req);
  if (action === 'create-prescription') return createPrescription(req);
  if (action === 'reset-password') return resetPassword(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}

// ✅ PATCH EXPORT
export async function PATCH(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'discharge-patient') return dischargePatient(req);

  return NextResponse.json(ApiResponse.error('Invalid action', 400), { status: 400 });
}
