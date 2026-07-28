import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const password = await bcrypt.hash('Admin@123', 12);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gandira.com' },
    update: {},
    create: { email: 'admin@gandira.com', password, name: 'Admin', role: 'ADMIN', isVerified: true },
  });

  // Producer
  const producer = await prisma.user.upsert({
    where: { email: 'produtor@gandira.com' },
    update: {},
    create: { email: 'produtor@gandira.com', password, name: 'João Produtor', role: 'PRODUCER', isVerified: true },
  });

  // Staff
  const staff = await prisma.user.upsert({
    where: { email: 'staff@gandira.com' },
    update: {},
    create: { email: 'staff@gandira.com', password, name: 'Maria Portaria', role: 'STAFF', isVerified: true },
  });

  // Customer
  const customer = await prisma.user.upsert({
    where: { email: 'cliente@gandira.com' },
    update: {},
    create: { email: 'cliente@gandira.com', password, name: 'Pedro Cliente', role: 'CUSTOMER' },
  });

  // Event
  const event = await prisma.event.upsert({
    where: { slug: 'gandira-fest-2025' },
    update: {},
    create: {
      producerId: producer.id,
      title: 'Gandira Fest 2025',
      description: 'O maior festival de música eletrônica do ano. 3 palcos, 20 artistas nacionais e internacionais, food trucks e muito mais.',
      slug: 'gandira-fest-2025',
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

  const sampleEvents = [
    {
      title: 'Noite Urbana', slug: 'noite-urbana-porto-alegre',
      description: 'Uma noite com música ao vivo, DJs e diferentes estilos em um encontro pensado para quem gosta de descobrir novos sons.',
      venue: 'Opinião', address: 'Rua José do Patrocínio, 834', zipCode: '90050-002',
      startDate: new Date('2027-09-18T22:00:00-03:00'), endDate: new Date('2027-09-19T04:00:00-03:00'), doorsOpen: new Date('2027-09-18T21:00:00-03:00'),
      price: 35, image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1200&q=82',
    },
    {
      title: 'Festival da Cidade', slug: 'festival-da-cidade-porto-alegre',
      description: 'Uma experiência com shows, gastronomia e atrações locais reunidas em uma programação especial.',
      venue: 'Pepsi on Stage', address: 'Avenida Severo Dullius, 1995', zipCode: '90200-310',
      startDate: new Date('2027-10-17T16:00:00-03:00'), endDate: new Date('2027-10-18T01:00:00-03:00'), doorsOpen: new Date('2027-10-17T15:00:00-03:00'),
      price: 45, image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=82',
    },
    {
      title: 'Sons do Guaíba', slug: 'sons-do-guaiba-porto-alegre',
      description: 'Uma noite especial com artistas convidados e repertório inspirado na cena musical contemporânea.',
      venue: 'Auditório Araújo Vianna', address: 'Avenida Osvaldo Aranha, 685', zipCode: '90035-191',
      startDate: new Date('2027-11-20T20:30:00-03:00'), endDate: new Date('2027-11-20T23:45:00-03:00'), doorsOpen: new Date('2027-11-20T19:30:00-03:00'),
      price: 50, image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=82',
    },
  ];

  for (const sample of sampleEvents) {
    const sampleEvent = await prisma.event.upsert({
      where: { slug: sample.slug },
      update: {
        title: sample.title, description: sample.description, venue: sample.venue, address: sample.address,
        city: 'Porto Alegre', state: 'RS', zipCode: sample.zipCode, startDate: sample.startDate,
        endDate: sample.endDate, doorsOpen: sample.doorsOpen, coverImage: sample.image, status: 'PUBLISHED', featured: false,
      },
      create: {
        producerId: producer.id, title: sample.title, description: sample.description, slug: sample.slug,
        coverImage: sample.image, venue: sample.venue, address: sample.address, city: 'Porto Alegre', state: 'RS',
        zipCode: sample.zipCode, startDate: sample.startDate, endDate: sample.endDate, doorsOpen: sample.doorsOpen,
        ageRating: 16, category: 'Shows', tags: ['música', 'porto alegre', 'ao vivo'], status: 'PUBLISHED', featured: false,
      },
    });
    const existingBatch = await prisma.batch.findFirst({ where: { eventId: sampleEvent.id, name: 'Lote inicial' } });
    const batchData = {
      price: sample.price, quantity: 500, sold: 0, startsAt: new Date('2026-01-01T00:00:00-03:00'),
      endsAt: new Date(sample.startDate.getTime() - 24 * 60 * 60 * 1000), ticketType: 'GENERAL' as const,
      status: 'ACTIVE' as const, sortOrder: 0,
    };
    if (existingBatch) await prisma.batch.update({ where: { id: existingBatch.id }, data: batchData });
    else await prisma.batch.create({ data: { eventId: sampleEvent.id, name: 'Lote inicial', ...batchData } });
  }

  console.log('✅ Seed complete!');
  console.log('\n👥 Users created:');
  console.log('  admin@gandira.com       → ADMIN    (senha: Admin@123)');
  console.log('  produtor@gandira.com    → PRODUCER (senha: Admin@123)');
  console.log('  staff@gandira.com       → STAFF    (senha: Admin@123)');
  console.log('  cliente@gandira.com     → CUSTOMER (senha: Admin@123)');
  console.log('\n🎉 Event created: Gandira Fest 2025 (slug: gandira-fest-2025)');
  console.log('🎶 Sample events ready: Noite Urbana, Festival da Cidade, Sons do Guaíba');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
