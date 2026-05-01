import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getEventReport(eventId: string, _producerId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const [ticketStats, revenueData, checkInCount, batchBreakdown, genderData, buyerBirthDates] =
      await Promise.all([
        // Total tickets by status
        this.prisma.ticket.groupBy({
          by: ['status'],
          where: { eventId },
          _count: { _all: true },
        }),

        // Revenue from paid orders
        this.prisma.order.aggregate({
          where: { eventId, status: 'PAID' },
          _sum: { subtotal: true, platformFee: true, total: true },
          _count: { _all: true },
        }),

        // Check-ins count
        this.prisma.checkIn.count({ where: { eventId } }),

        // Revenue and sold per batch
        this.prisma.batch.findMany({
          where: { eventId },
          select: {
            id: true,
            name: true,
            ticketType: true,
            price: true,
            quantity: true,
            sold: true,
            status: true,
          },
          orderBy: { sortOrder: 'asc' },
        }),

        // Gender breakdown (from users who provided it)
        this.prisma.user.groupBy({
          by: ['gender'],
          where: { orders: { some: { eventId, status: 'PAID' } } },
          _count: { _all: true },
        }),

        // Birth dates for average age calculation
        this.prisma.user.findMany({
          where: {
            orders: { some: { eventId, status: 'PAID' } },
            birthDate: { not: null },
          },
          select: { birthDate: true },
        }),
      ]);

    const statusMap = Object.fromEntries(
      ticketStats.map((s) => [s.status, s._count._all]),
    );

    const now = Date.now();
    const avgAge = buyerBirthDates.length > 0
      ? Math.round(
          buyerBirthDates.reduce((sum, u) => {
            const age = (now - new Date(u.birthDate!).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
            return sum + age;
          }, 0) / buyerBirthDates.length,
        )
      : null;

    const totalGenderCount = genderData.reduce((s, g) => s + g._count._all, 0);

    const totalSold = batchBreakdown.reduce((sum, b) => sum + b.sold, 0);
    const totalRevenue = batchBreakdown.reduce((sum, b) => sum + Number(b.price) * b.sold, 0);

    return {
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        status: event.status,
      },
      tickets: {
        total: totalSold,
        active: statusMap['ACTIVE'] ?? 0,
        used: statusMap['USED'] ?? 0,
        cancelled: statusMap['CANCELLED'] ?? 0,
      },
      revenue: {
        orders: revenueData._count._all,
        subtotal: revenueData._sum.subtotal ?? 0,
        platformFee: revenueData._sum.platformFee ?? 0,
        total: totalRevenue,
      },
      checkIns: {
        count: checkInCount,
        rate: totalSold > 0 ? ((checkInCount / totalSold) * 100).toFixed(1) : '0',
      },
      batches: batchBreakdown.map((b) => ({
        ...b,
        revenue: Number(b.price) * b.sold,
        available: b.quantity - b.sold,
        occupancyRate: ((b.sold / b.quantity) * 100).toFixed(1) + '%',
      })),
      audience: {
        gender: genderData.map((g) => ({
          gender: g.gender,
          count: g._count._all,
          pct: totalGenderCount > 0 ? Math.round((g._count._all / totalGenderCount) * 100) : 0,
        })),
        totalWithProfile: totalGenderCount,
        avgAge,
      },
    };
  }

  async getProducerDashboard(_producerId: string) {
    const [eventCount, totalRevenue, totalTickets, recentOrders] = await Promise.all([
      this.prisma.event.count(),

      this.prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { total: true },
      }),

      this.prisma.ticket.count({
        where: { status: { in: ['ACTIVE', 'USED'] } },
      }),

      this.prisma.order.findMany({
        where: { status: 'PAID' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { title: true } },
          user: { select: { name: true, email: true } },
          items: { include: { batch: { select: { name: true } } } },
        },
      }),
    ]);

    return {
      summary: {
        events: eventCount,
        totalRevenue: totalRevenue._sum.total ?? 0,
        totalTicketsSold: totalTickets,
      },
      recentOrders,
    };
  }
}
