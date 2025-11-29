// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create system-level roles (no hospitalId, shared by all)
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Platform administrator', isSystemRole: true },
    { name: 'HOSPITAL_ADMIN', description: 'Hospital administrator', isSystemRole: true },
    { name: 'DOCTOR', description: 'Medical practitioner', isSystemRole: true },
    { name: 'NURSE', description: 'Nursing staff', isSystemRole: true },
    { name: 'PHARMACIST', description: 'Pharmacy staff', isSystemRole: true },
    { name: 'RECEPTIONIST', description: 'Front desk staff', isSystemRole: true },
  ];

  for (const role of roles) {
    const existing = await prisma.role.findUnique({ where: { name: role.name } });
    if (!existing) {
      await prisma.role.create({
        data: {
          name: role.name,
          description: role.description,
          isSystemRole: true,
          isActive: true,
        },
      });
      console.log(`✅ Created role: ${role.name}`);
    } else {
      console.log(`⏭️  Role already exists: ${role.name}`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
