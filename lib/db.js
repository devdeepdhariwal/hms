import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================
// COMMON DATABASE QUERIES
// ============================================
export const db = {
  // ========== USER QUERIES ==========
  getUserWithRoles: async (email) => {
    return prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { permissions: true },
        },
      },
    });
  },
  
  getUserById: async (id) => {
    return prisma.user.findUnique({
      where: { id },
      include: {
        roles: { select: { name: true } },
        hospital: { select: { id: true, name: true } },
      },
    });
  },
  
  getAllUsers: async (where, skip, take, orderBy) => {
    return prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        phone: true,
        status: true,
        department: true,
        tenantId: true,
        createdAt: true,
        lastLoginAt: true,
        hospital: {
          select: {
            id: true,
            name: true,
          },
        },
        roles: {
          select: {
            name: true,
          },
        },
      },
    });
  },
  
  // ========== HOSPITAL QUERIES ==========
  getHospitalsWithStats: async (where, skip, take, orderBy) => {
    return prisma.hospital.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            prescriptions: true,
            departments: true,
          },
        },
      },
    });
  },
  
  getHospitalById: async (id) => {
    return prisma.hospital.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
            roles: { select: { name: true } },
          },
        },
        departments: true,
        _count: {
          select: {
            users: true,
            patients: true,
            prescriptions: true,
          },
        },
      },
    });
  },
  
  updateHospitalStatus: async (id, status, additionalData = {}) => {
    return prisma.hospital.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  },
  
  // ========== DASHBOARD QUERIES ==========
  getDashboardStats: async () => {
    const [
      totalHospitals,
      hospitalsByStatus,
      activeHospitals,
      pendingApprovals,
      totalUsers,
      totalPatients,
      totalPrescriptions,
      newHospitalsThisMonth,
      recentHospitals,
    ] = await Promise.all([
      prisma.hospital.count(),
      prisma.hospital.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.hospital.count({ where: { status: 'ACTIVE' } }),
      prisma.hospital.count({ where: { status: 'PENDING' } }),
      prisma.user.count(),
      prisma.patient.count(),
      prisma.prescription.count(),
      prisma.hospital.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.hospital.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);
    
    return {
      overview: {
        totalHospitals,
        activeHospitals,
        pendingApprovals,
        newHospitalsThisMonth,
      },
      hospitals: {
        byStatus: hospitalsByStatus.reduce((acc, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        }, {}),
      },
      platform: {
        totalUsers,
        totalPatients,
        totalPrescriptions,
      },
      recentHospitals,
    };
  },
  
  getHospitalStats: async () => {
    return prisma.hospital.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            patients: true,
            prescriptions: true,
            departments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  
  // ========== SEARCH QUERIES ==========
  globalSearch: async (query) => {
    const [hospitals, users, patients] = await Promise.all([
      prisma.hospital.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { licenseNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, email: true, status: true },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          hospital: { select: { name: true } },
        },
      }),
      prisma.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { patientId: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: {
          id: true,
          patientId: true,
          firstName: true,
          lastName: true,
          hospital: { select: { name: true } },
        },
      }),
    ]);
    
    return { hospitals, users, patients };
  },
  
  // ========== PERMISSION & ROLE QUERIES ==========
  getAllPermissions: async () => {
    return prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  },
  
  getAllRoles: async () => {
    return prisma.role.findMany({
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  },
};

export default prisma;
