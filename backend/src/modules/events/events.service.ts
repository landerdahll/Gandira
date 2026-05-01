import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { slugify } from '../../common/utils/crypto.util';
import { randomBytes } from 'crypto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEventDto, producerId: string) {
    let slug = slugify(dto.title);
    const existing = await this.prisma.event.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${randomBytes(3).toString('hex')}`;

    return this.prisma.event.create({
      data: {
        ...dto,
        slug,
        producerId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        doorsOpen: dto.doorsOpen ? new Date(dto.doorsOpen) : undefined,
      },
    });
  }

  async findAll(query: {
    city?: string;
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
    past?: boolean;
  }) {
    const { city, category, page = 1, limit = 20, search, past = false } = query;
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const now = new Date();
    const where = {
      status: EventStatus.PUBLISHED,
      startDate: past ? { lt: now } : { gte: now },
      ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { venue: { contains: search, mode: 'insensitive' as const } },
          { city: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: past ? 'desc' : 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          venue: true,
          city: true,
          state: true,
          startDate: true,
          endDate: true,
          category: true,
          ageRating: true,
          batches: {
            where: { status: 'ACTIVE' },
            orderBy: { price: 'asc' },
            take: 1,
            select: { price: true, name: true },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, lastPage: Math.ceil(total / take) },
    };
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        producer: { select: { id: true, name: true } },
        batches: {
          where: { status: { in: ['ACTIVE', 'SOLD_OUT'] } },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            quantity: true,
            sold: true,
            startsAt: true,
            endsAt: true,
            ticketType: true,
            status: true,
          },
        },
      },
    });

    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Evento não encontrado');
    }

    return event;
  }

  async findProducerEvents(producerId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { producerId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tickets: true, orders: true } },
          batches: { select: { price: true, sold: true } },
        },
      }),
      this.prisma.event.count({ where: { producerId } }),
    ]);

    return {
      data,
      meta: { total, page, lastPage: Math.ceil(total / take) },
    };
  }

  async findByIdForProducer(eventId: string, producerId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        batches: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.producerId !== producerId) throw new ForbiddenException('Acesso negado');
    return event;
  }

  async update(eventId: string, producerId: string, dto: UpdateEventDto) {
    await this.getOwnedEvent(eventId, producerId);
    const { startDate, endDate, doorsOpen, ...rest } = dto;
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...rest,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(doorsOpen !== undefined && { doorsOpen: doorsOpen ? new Date(doorsOpen) : null }),
      },
    });
  }

  async publish(eventId: string, producerId: string) {
    const event = await this.getOwnedEvent(eventId, producerId);

    const hasBatches = await this.prisma.batch.count({ where: { eventId, status: 'ACTIVE' } });
    if (!hasBatches) {
      throw new ForbiddenException('Crie pelo menos um lote antes de publicar');
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.PUBLISHED },
    });
  }

  async cancel(eventId: string, producerId: string) {
    const event = await this.getOwnedEvent(eventId, producerId);

    if (event.status === EventStatus.FINISHED) {
      throw new ForbiddenException('Evento já finalizado');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id: eventId }, data: { status: EventStatus.CANCELLED } });
      await tx.batch.updateMany({ where: { eventId }, data: { status: 'CANCELLED' } });
      // Cancel active tickets — webhook will trigger refunds
      await tx.ticket.updateMany({
        where: { eventId, status: 'ACTIVE' },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    });
  }

  private async getOwnedEvent(eventId: string, producerId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.producerId !== producerId) throw new ForbiddenException('Acesso negado');
    return event;
  }
}
