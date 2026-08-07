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

  it('renders organization invitation with inviter, friendly role and optional message', () => {
    const result = renderMail('ORGANIZATION_INVITATION', {
      organizationName: 'Outra Hora', inviterName: 'William Landerdahl', role: 'PRODUCER',
      customMessage: 'Vai ser ótimo ter você no time!', url: 'https://pago.outrahora.com/organization-invitations/accept?token=safe',
    }, 'https://pago.outrahora.com/logo.svg');
    expect(result.html).toContain('William Landerdahl convidou você');
    expect(result.html).toContain('como Produtor');
    expect(result.html).toContain('Vai ser ótimo ter você no time!');
    expect(result.text).toContain('válido por 30 dias');
    expect(result.html).toContain('Aceitar convite');
    expect(result.html).toContain('background:#f4f7f8');
    expect(result.html).toContain('pago.outrahora.com');
  });

  it('omits the custom message block when no invitation message was provided', () => {
    const result = renderMail('ORGANIZATION_INVITATION', {
      organizationName: 'Outra Hora', inviterName: 'Outra Hora', role: 'STAFF', url: 'https://pago.outrahora.com/invite',
    }, 'https://pago.outrahora.com/logo.svg');
    expect(result.text).not.toContain('Mensagem:');
    expect(result.html).toContain('como Staff');
  });
});
