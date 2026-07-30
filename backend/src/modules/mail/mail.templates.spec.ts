import { renderMail } from './mail.templates';

describe('mail templates', () => {
  it('gera HTML e texto da compra com identidade e link oficiais', () => {
    const result = renderMail('ORDER_CONFIRMATION', {
      name: 'Cliente', eventTitle: 'Show', eventDate: '2026-08-01T22:00:00.000Z', venue: 'Casa', city: 'São Paulo',
      items: [{ batchName: 'Primeiro lote', quantity: 2 }], total: 100, orderId: 'order-1', myTicketsUrl: 'https://pago.outrahora.com/my-tickets',
    }, 'https://pago.outrahora.com/logo-full-white.svg');
    expect(result.html).toContain('Pago by OutraHora');
    expect(result.html).toContain('order-1');
    expect(result.text).toContain('https://pago.outrahora.com/my-tickets');
    expect(`${result.html}${result.text}`).not.toMatch(/Gandira/i);
  });

  it('escapa conteúdo fornecido pelo usuário', () => {
    const result = renderMail('TRANSFER', { subject: '<script>', message: '<b>teste</b>' }, 'https://pago.outrahora.com/logo.svg');
    expect(result.html).not.toContain('<script>');
    expect(result.html).not.toContain('<b>teste</b>');
  });
});
