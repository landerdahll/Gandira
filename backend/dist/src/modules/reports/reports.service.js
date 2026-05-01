"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getEventReport(eventId, producerId) {
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event)
            throw new common_1.NotFoundException('Evento não encontrado');
        if (event.producerId !== producerId)
            throw new common_1.ForbiddenException('Acesso negado');
        const [ticketStats, revenueData, checkInCount, batchBreakdown, genderData, buyerBirthDates] = await Promise.all([
            this.prisma.ticket.groupBy({
                by: ['status'],
                where: { eventId },
                _count: { _all: true },
            }),
            this.prisma.order.aggregate({
                where: { eventId, status: 'PAID' },
                _sum: { subtotal: true, platformFee: true, total: true },
                _count: { _all: true },
            }),
            this.prisma.checkIn.count({ where: { eventId } }),
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
            this.prisma.user.groupBy({
                by: ['gender'],
                where: { orders: { some: { eventId, status: 'PAID' } } },
                _count: { _all: true },
            }),
            this.prisma.user.findMany({
                where: {
                    orders: { some: { eventId, status: 'PAID' } },
                    birthDate: { not: null },
                },
                select: { birthDate: true },
            }),
        ]);
        const statusMap = Object.fromEntries(ticketStats.map((s) => [s.status, s._count._all]));
        const now = Date.now();
        const avgAge = buyerBirthDates.length > 0
            ? Math.round(buyerBirthDates.reduce((sum, u) => {
                const age = (now - new Date(u.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                return sum + age;
            }, 0) / buyerBirthDates.length)
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
    async getProducerDashboard(producerId) {
        const [eventCount, totalRevenue, totalTickets, recentOrders] = await Promise.all([
            this.prisma.event.count({ where: { producerId } }),
            this.prisma.order.aggregate({
                where: { event: { producerId }, status: 'PAID' },
                _sum: { total: true },
            }),
            this.prisma.ticket.count({
                where: { event: { producerId }, status: { in: ['ACTIVE', 'USED'] } },
            }),
            this.prisma.order.findMany({
                where: { event: { producerId }, status: 'PAID' },
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map