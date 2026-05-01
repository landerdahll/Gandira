import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async create(eventId: string, dto: CreateBatchDto, producerId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.producerId !== producerId) throw new ForbiddenException('Acesso negado');
    if (event.status === 'CANCELLED' || event.status === 'FINISHED') {
      throw new ForbiddenException('Evento não permite alterações');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) throw new BadRequestException('Data de fim deve ser após a de início');
    if (endsAt > event.startDate) {
      throw new BadRequestException('Lote não pode terminar após o início do evento');
    }

    return this.prisma.batch.create({
      data: {
        eventId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        quantity: dto.quantity,
        startsAt,
        endsAt,
        ticketType: dto.ticketType ?? 'GENERAL',
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(eventId: string, batchId: string, dto: UpdateBatchDto, producerId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    if (event.producerId !== producerId) throw new ForbiddenException('Acesso negado');

    const batch = await this.prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch || batch.eventId !== eventId) throw new NotFoundException('Lote não encontrado');

    if (dto.quantity !== undefined && dto.quantity < batch.sold) {
      throw new BadRequestException(`Quantidade não pode ser menor que os ${batch.sold} ingressos já vendidos`);
    }

    const updated = await this.prisma.batch.update({
      where: { id: batchId },
      data: {
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        // Re-activate if quantity was expanded beyond sold count
        ...(dto.quantity !== undefined && dto.quantity > batch.sold && batch.status === 'SOLD_OUT' && { status: 'ACTIVE' }),
      },
    });

    return updated;
  }

  async findByEvent(eventId: string) {
    return this.prisma.batch.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Atomically reserve stock — called inside order transaction
  async reserveStock(batchId: string, quantity: number, tx: any) {
    const batch = await tx.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Lote não encontrado');
    if (batch.status !== 'ACTIVE') throw new BadRequestException(`Lote "${batch.name}" indisponível`);

    const now = new Date();
    if (now < batch.startsAt || now > batch.endsAt) {
      throw new BadRequestException(`Lote "${batch.name}" fora do período de vendas`);
    }

    const available = batch.quantity - batch.sold;
    if (available < quantity) {
      throw new BadRequestException(
        `Ingressos insuficientes no lote "${batch.name}". Disponíveis: ${available}`,
      );
    }

    const updated = await tx.batch.update({
      where: { id: batchId, sold: { lte: batch.quantity - quantity } }, // optimistic lock
      data: { sold: { increment: quantity } },
    });

    if (!updated) throw new BadRequestException('Conflito de estoque. Tente novamente.');

    if (updated.sold >= updated.quantity) {
      await tx.batch.update({ where: { id: batchId }, data: { status: 'SOLD_OUT' } });
    }

    return updated;
  }

  // Release stock on order cancellation / expiry
  async releaseStock(batchId: string, quantity: number) {
    return this.prisma.batch.update({
      where: { id: batchId },
      data: {
        sold: { decrement: quantity },
        status: 'ACTIVE',
      },
    });
  }
}
