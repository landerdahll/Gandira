import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const password = await bcrypt.hash('Admin@123', 12);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@outrahora.com' },
    update: {},
    create: { email: 'admin@outrahora.com', password, name: 'Admin', role: 'ADMIN', isVerified: true },
  });

  // Producer
  const producer = await prisma.user.upsert({
    where: { email: 'produtor@outrahora.com' },
    update: {},
    create: { email: 'produtor@outrahora.com', password, name: 'João Produtor', role: 'PRODUCER', isVerified: true },
  });

  // Staff
  const staff = await prisma.user.upsert({
    where: { email: 'staff@outrahora.com' },
    update: {},
    create: { email: 'staff@outrahora.com', password, name: 'Maria Portaria', role: 'STAFF', isVerified: true },
  });

  // Customer
  const customer = await prisma.user.upsert({
    where: { email: 'cliente@outrahora.com' },
    update: {},
    create: { email: 'cliente@outrahora.com', password, name: 'Pedro Cliente', role: 'CUSTOMER' },
  });

  // Event
  const event = await prisma.event.create({
    data: {
      producerId: producer.id,
      title: 'OutraFest 2025',
      description: 'O maior festival de música eletrônica do ano. 3 palcos, 20 artistas nacionais e internacionais, food trucks e muito mais.',
      slug: 'outrafest-2025',
      venue: 'Espaço das Américas',
      address: 'Rua Tagipuru, 795',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01156-000',
      startDate: new Date('2025-09-20T21:00:00-03:00'),
      endDate: new Date('2025-09-21T06:00:00-03:00'),
      doorsOpen: new Date('2025-09-20T20:00:00-03:00'),
      ageRating: 18,
      category: 'Shows',
      tags: ['eletrônico', 'festival', 'noite'],
      status: 'PUBLISHED',
    },
  });

  // Batches
  await prisma.batch.createMany({
    data: [
      {
        eventId: event.id, name: '1º Lote', price: 89.90, quantity: 500,
        startsAt: new Date('2025-06-01'), endsAt: new Date('2025-07-31'), ticketType: 'GENERAL', sortOrder: 0,
      },
      {
        eventId: event.id, name: '2º Lote', price: 129.90, quantity: 1000,
        startsAt: new Date('2025-08-01'), endsAt: new Date('2025-09-10'), ticketType: 'GENERAL', sortOrder: 1,
      },
      {
        eventId: event.id, name: 'VIP', description: 'Área exclusiva + open bar', price: 299.00, quantity: 100,
        startsAt: new Date('2025-06-01'), endsAt: new Date('2025-09-10'), ticketType: 'VIP', sortOrder: 2,
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('\n👥 Users created:');
  console.log('  admin@outrahora.com       → ADMIN    (senha: Admin@123)');
  console.log('  produtor@outrahora.com    → PRODUCER (senha: Admin@123)');
  console.log('  staff@outrahora.com       → STAFF    (senha: Admin@123)');
  console.log('  cliente@outrahora.com     → CUSTOMER (senha: Admin@123)');
  console.log('\n🎉 Event created: OutraFest 2025 (slug: outrafest-2025)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
