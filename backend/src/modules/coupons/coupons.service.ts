import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(eventId: string, producerId: string, dto: CreateCouponDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.producerId !== producerId) throw new ForbiddenException('Acesso negado');

    const code = dto.code.toUpperCase().trim();

    const existing = await this.prisma.coupon.findUnique({
      where: { eventId_code: { eventId, code } },
    });
    if (existing) throw new ConflictException('Já existe um cupom com esse código para este evento');

    return this.prisma.coupon.create({
      data: {
        eventId,
        code,
        discount: dto.discount,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: true,
      },
    });
  }

  async list(eventId: string, producerId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.producerId !== producerId) throw new ForbiddenException('Acesso negado');

    return this.prisma.coupon.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(eventId: string, couponId: string, producerId: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
      include: { event: { select: { producerId: true } } },
    });
    if (!coupon || coupon.eventId !== eventId) throw new NotFoundException('Cupom não encontrado');
    if (coupon.event.producerId !== producerId) throw new ForbiddenException('Acesso negado');

    await this.prisma.coupon.delete({ where: { id: couponId } });
  }

  async validate(eventId: string, code: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { eventId_code: { eventId, code: code.toUpperCase().trim() } },
    });

    if (!coupon || !coupon.isActive) throw new BadRequestException('Cupom inválido');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('Cupom expirado');
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Cupom esgotado');

    return { id: coupon.id, code: coupon.code, discount: Number(coupon.discount) };
  }
}
