const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create default permissions
  const permissions = [
    // Dashboard
    { resource: 'DASHBOARD', action: 'VIEW', code: 'DASHBOARD:VIEW', description: 'View dashboard' },
    
    // Hospital management (SUPER_ADMIN only)
    { resource: 'HOSPITAL', action: 'CREATE', code: 'HOSPITAL:CREATE', description: 'Register new hospital' },
    { resource: 'HOSPITAL', action: 'READ', code: 'HOSPITAL:READ', description: 'View hospital details' },
    { resource: 'HOSPITAL', action: 'UPDATE', code: 'HOSPITAL:UPDATE', description: 'Update hospital' },
    { resource: 'HOSPITAL', action: 'DELETE', code: 'HOSPITAL:DELETE', description: 'Delete hospital' },
    { resource: 'HOSPITAL', action: 'APPROVE', code: 'HOSPITAL:APPROVE', description: 'Approve hospital registration' },
    { resource: 'HOSPITAL', action: 'SUSPEND', code: 'HOSPITAL:SUSPEND', description: 'Suspend hospital' },
    
    // User management
    { resource: 'USER', action: 'CREATE', code: 'USER:CREATE', description: 'Create user' },
    { resource: 'USER', action: 'READ', code: 'USER:READ', description: 'View users' },
    { resource: 'USER', action: 'UPDATE', code: 'USER:UPDATE', description: 'Update user' },
    { resource: 'USER', action: 'DELETE', code: 'USER:DELETE', description: 'Delete user' },
    
    // Role management
    { resource: 'ROLE', action: 'CREATE', code: 'ROLE:CREATE', description: 'Create role' },
    { resource: 'ROLE', action: 'READ', code: 'ROLE:READ', description: 'View roles' },
    { resource: 'ROLE', action: 'UPDATE', code: 'ROLE:UPDATE', description: 'Update role' },
    { resource: 'ROLE', action: 'DELETE', code: 'ROLE:DELETE', description: 'Delete role' },
    
    // Department management
    { resource: 'DEPARTMENT', action: 'CREATE', code: 'DEPARTMENT:CREATE', description: 'Create department' },
    { resource: 'DEPARTMENT', action: 'READ', code: 'DEPARTMENT:READ', description: 'View departments' },
    { resource: 'DEPARTMENT', action: 'UPDATE', code: 'DEPARTMENT:UPDATE', description: 'Update department' },
    { resource: 'DEPARTMENT', action: 'DELETE', code: 'DEPARTMENT:DELETE', description: 'Delete department' },
    
    // Patient management
    { resource: 'PATIENT', action: 'CREATE', code: 'PATIENT:CREATE', description: 'Register patient' },
    { resource: 'PATIENT', action: 'READ', code: 'PATIENT:READ', description: 'View patients' },
    { resource: 'PATIENT', action: 'UPDATE', code: 'PATIENT:UPDATE', description: 'Update patient' },
    { resource: 'PATIENT', action: 'DELETE', code: 'PATIENT:DELETE', description: 'Delete patient' },
    { resource: 'PATIENT', action: 'EXPORT', code: 'PATIENT:EXPORT', description: 'Export patient data' },
    
    // Prescription management
    { resource: 'PRESCRIPTION', action: 'CREATE', code: 'PRESCRIPTION:CREATE', description: 'Create prescription' },
    { resource: 'PRESCRIPTION', action: 'READ', code: 'PRESCRIPTION:READ', description: 'View prescriptions' },
    { resource: 'PRESCRIPTION', action: 'UPDATE', code: 'PRESCRIPTION:UPDATE', description: 'Update prescription' },
    { resource: 'PRESCRIPTION', action: 'DELETE', code: 'PRESCRIPTION:DELETE', description: 'Delete prescription' },
    { resource: 'PRESCRIPTION', action: 'DISPENSE', code: 'PRESCRIPTION:DISPENSE', description: 'Dispense prescription' },
    
    // Reports
    { resource: 'REPORT', action: 'VIEW', code: 'REPORT:VIEW', description: 'View reports' },
    { resource: 'REPORT', action: 'EXPORT', code: 'REPORT:EXPORT', description: 'Export reports' },
  ];

  console.log('Creating permissions...');
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {},
      create: permission,
    });
  }
  console.log(`✓ Created ${permissions.length} permissions`);

  // Get all permissions
  const allPermissions = await prisma.permission.findMany();
  const permissionIds = allPermissions.map(p => p.id);

  // ========================================
  // Create SUPER_ADMIN role (all permissions)
  // ========================================
  console.log('Creating SUPER_ADMIN role...');
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {
      permissionIds: permissionIds,
    },
    create: {
      name: 'SUPER_ADMIN',
      description: 'Platform administrator with all permissions',
      isSystemRole: true,
      permissionIds: permissionIds,
    },
  });
  console.log('✓ SUPER_ADMIN role created');

  // ========================================
  // Create HOSPITAL_ADMIN role
  // ========================================
  console.log('Creating HOSPITAL_ADMIN role...');
  const hospitalAdminPermissions = allPermissions.filter(p => 
    // Exclude platform-level hospital management (except READ)
    !['HOSPITAL:CREATE', 'HOSPITAL:DELETE', 'HOSPITAL:APPROVE', 'HOSPITAL:SUSPEND'].includes(p.code)
  ).map(p => p.id);

  const hospitalAdminRole = await prisma.role.upsert({
    where: { name: 'HOSPITAL_ADMIN' },
    update: {
      permissionIds: hospitalAdminPermissions,
    },
    create: {
      name: 'HOSPITAL_ADMIN',
      description: 'Hospital administrator - manages hospital operations',
      isSystemRole: true,
      permissionIds: hospitalAdminPermissions,
    },
  });
  console.log('✓ HOSPITAL_ADMIN role created');

  // ========================================
  // Create DOCTOR role
  // ========================================
  console.log('Creating DOCTOR role...');
  const doctorPermissions = allPermissions.filter(p => 
    p.code === 'DASHBOARD:VIEW' ||
    p.code.startsWith('PATIENT:') ||
    p.code.startsWith('PRESCRIPTION:') ||
    p.code === 'DEPARTMENT:READ'
  ).map(p => p.id);

  const doctorRole = await prisma.role.upsert({
    where: { name: 'DOCTOR' },
    update: {
      permissionIds: doctorPermissions,
    },
    create: {
      name: 'DOCTOR',
      description: 'Medical practitioner - manages patients and prescriptions',
      isSystemRole: true,
      permissionIds: doctorPermissions,
    },
  });
  console.log('✓ DOCTOR role created');

  // ========================================
  // Create NURSE role
  // ========================================
  console.log('Creating NURSE role...');
  const nursePermissions = allPermissions.filter(p => 
    p.code === 'DASHBOARD:VIEW' ||
    p.code === 'PATIENT:READ' ||
    p.code === 'PATIENT:UPDATE' ||
    p.code === 'PRESCRIPTION:READ' ||
    p.code === 'DEPARTMENT:READ'
  ).map(p => p.id);

  const nurseRole = await prisma.role.upsert({
    where: { name: 'NURSE' },
    update: {
      permissionIds: nursePermissions,
    },
    create: {
      name: 'NURSE',
      description: 'Nursing staff - patient care and monitoring',
      isSystemRole: true,
      permissionIds: nursePermissions,
    },
  });
  console.log('✓ NURSE role created');

  // ========================================
  // Create PHARMACIST role
  // ========================================
  console.log('Creating PHARMACIST role...');
  const pharmacistPermissions = allPermissions.filter(p => 
    p.code === 'DASHBOARD:VIEW' ||
    p.code === 'PRESCRIPTION:READ' ||
    p.code === 'PRESCRIPTION:DISPENSE' ||
    p.code === 'PATIENT:READ'
  ).map(p => p.id);

  const pharmacistRole = await prisma.role.upsert({
    where: { name: 'PHARMACIST' },
    update: {
      permissionIds: pharmacistPermissions,
    },
    create: {
      name: 'PHARMACIST',
      description: 'Pharmacy staff - dispenses prescriptions',
      isSystemRole: true,
      permissionIds: pharmacistPermissions,
    },
  });
  console.log('✓ PHARMACIST role created');

  // ========================================
  // Create RECEPTIONIST role
  // ========================================
  console.log('Creating RECEPTIONIST role...');
  const receptionistPermissions = allPermissions.filter(p => 
    p.code === 'DASHBOARD:VIEW' ||
    p.code === 'PATIENT:CREATE' ||
    p.code === 'PATIENT:READ' ||
    p.code === 'PATIENT:UPDATE' ||
    p.code === 'DEPARTMENT:READ'
  ).map(p => p.id);

  const receptionistRole = await prisma.role.upsert({
    where: { name: 'RECEPTIONIST' },
    update: {
      permissionIds: receptionistPermissions,
    },
    create: {
      name: 'RECEPTIONIST',
      description: 'Front desk staff - patient registration and appointments',
      isSystemRole: true,
      permissionIds: receptionistPermissions,
    },
  });
  console.log('✓ RECEPTIONIST role created');

  // ========================================
  // Create SUPER_ADMIN user
  // ========================================
  console.log('Creating SUPER_ADMIN user...');
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@hospital.com' },
    update: {},
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@hospital.com',
      username: 'superadmin',
      phone: '1234567890',
      password: hashedPassword,
      status: 'ACTIVE',
      isEmailVerified: true,
      mustChangePassword: false,
      roleIds: [superAdminRole.id],
    },
  });

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Super Admin Credentials:');
  console.log('   Email: superadmin@hospital.com');
  console.log('   Username: superadmin');
  console.log('   Password: Admin@123');
  console.log('\n📊 Roles Created:');
  console.log('   - SUPER_ADMIN (all permissions)');
  console.log('   - HOSPITAL_ADMIN (hospital management)');
  console.log('   - DOCTOR (patient & prescription management)');
  console.log('   - NURSE (patient care)');
  console.log('   - PHARMACIST (prescription dispensing)');
  console.log('   - RECEPTIONIST (patient registration)');
  console.log('\n🚀 You can now start the development server with: npm run dev\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
