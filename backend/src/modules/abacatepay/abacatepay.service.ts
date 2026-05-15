import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { MailService } from '../mail/mail.service';

const BASE_URL = 'https://api.abacatepay.com/v2';

@Injectable()
export class AbacatepayService {
  private readonly logger = new Logger(AbacatepayService.name);
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private tickets: TicketsService,
    private mail: MailService,
  ) {
    this.apiKey = config.get<string>('ABACATEPAY_API_KEY')!;
    this.webhookSecret = config.get<string>('ABACATEPAY_WEBHOOK_SECRET', '');
  }

  async createPixCharge(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { event: { select: { title: true } } },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.userId !== userId) throw new ForbiddenException('Acesso negado');
    if (order.status !== 'PENDING') throw new BadRequestException('Pedido não está mais pendente');

    const amountCents = Math.round(Number(order.total) * 100);

    const res = await fetch(`${BASE_URL}/transparents/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'PIX',
        data: {
          amount: amountCents,
          externalId: orderId,
          description: `Ingressos - ${order.event.title}`,
          expiresIn: 3600,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`AbacatePay create error: ${err}`);
      throw new BadRequestException('Erro ao gerar cobrança PIX');
    }

    const body = await res.json();
    this.logger.log(`AbacatePay create response: ${JSON.stringify(body)}`);
    const data = body.data;

    return {
      id: data.id,
      brCode: data.brCode,
      brCodeBase64: data.brCodeBase64,
      expiresAt: data.expiresAt,
    };
  }

  async simulatePixPayment(pixId: string) {
    const res = await fetch(`${BASE_URL}/transparents/simulate-payment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: pixId }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`AbacatePay simulate error: ${err}`);
      throw new BadRequestException('Erro ao simular pagamento');
    }

    return { simulated: true };
  }

  async handleWebhook(payload: any, secret: string) {
    if (this.webhookSecret && secret !== this.webhookSecret) {
      this.logger.warn('AbacatePay webhook: secret inválido');
      return;
    }

    const event: string = payload.event;
    this.logger.log(`AbacatePay webhook: ${event}`);

    if (event !== 'transparent.completed') return;

    const externalId: string | undefined = payload.data?.externalId;
    if (!externalId) {
      this.logger.error('AbacatePay webhook: externalId ausente');
      return;
    }

    await this.onPixPaid(externalId);
  }

  private async onPixPaid(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { batch: true } } },
    });

    if (!order) {
      this.logger.error(`AbacatePay: pedido ${orderId} não encontrado`);
      return;
    }

    if (order.status === 'PAID') {
      this.logger.warn(`AbacatePay: pedido ${orderId} já pago — idempotente`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          await this.tickets.generateTicket(
            { orderId: order.id, batchId: item.batchId, eventId: order.eventId },
            tx,
          );
        }
      }
    });

    this.logger.log(`PIX confirmado para pedido ${orderId} — ingressos gerados`);

    // Fire-and-forget: e-mail de confirmação
    this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true, name: true } },
        event: { select: { title: true, startDate: true, venue: true, city: true } },
        items: { include: { batch: { select: { name: true, ticketType: true } } } },
        tickets: { select: { id: true } },
      },
    }).then(full => {
      if (!full) return;
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000').split(',')[0].trim();
      this.mail.sendOrderConfirmation(full.user.email, full.user.name, {
        eventTitle: full.event.title,
        eventDate: full.event.startDate,
        venue: `${full.event.venue}, ${full.event.city}`,
        items: full.items.map(i => ({ batchName: i.batch.name, ticketType: i.batch.ticketType, quantity: i.quantity })),
        total: Number(full.total),
        ticketCount: full.tickets.length,
        myTicketsUrl: `${frontendUrl}/my-tickets`,
      }).catch(err => this.logger.error(`E-mail falhou: ${err.message}`));
    }).catch(err => this.logger.error(`Busca de pedido falhou: ${err.message}`));
  }
}
