import { renderMail } from './mail.templates';

describe('mail templates', () => {
  it('gera HTML e texto da compra com identidade e link oficiais', () => {
    const result = renderMail('ORDER_CONFIRMATION', {
      name: 'Cliente', eventTitle: 'Show', eventDate: '2026-08-01T22:00:00.000Z', venue: 'Casa', city: 'São Paulo',
      items: [{ batchName: 'Primeiro lote', quantity: 2 }], total: 100, orderId: 'order-1', myTicketsUrl: 'https://pago.outrahora.com/my-tickets',
    }, 'https://pago.outrahora.com/logo-full-white.svg');
    expect(result.html).toContain('pago.outrahora.com');
    expect(result.html).not.toContain('Pago by OutraHora');
    expect(result.text).not.toContain('Pago by OutraHora');
    expect(result.html).toContain('order-1');
    expect(result.text).toContain('https://pago.outrahora.com/my-tickets');
    expect(result.html).toContain('Ver meus ingressos');
    expect(result.html).toContain('#f4f7f9');
    expect(result.html).toContain('#ffffff');
    expect(result.html).toContain('#172027');
    expect(result.html).toContain('#67bed9');
    expect(result.html).toContain('color-scheme:light');
    expect(result.html).not.toContain('background:#0a0a0a');
    expect(result.html).not.toContain('background:#111');
    expect(result.html).not.toContain('Pago by OutraHora ·');
    expect(`${result.html}${result.text}`).not.toMatch(/Gandira/i);
  });

  it.each(['EMAIL_VERIFICATION', 'PASSWORD_RESET', 'TRANSFER', 'REFUND_CONFIRMATION'] as const)('usa tema claro fixo em %s', template => {
    const result = renderMail(template, {
      name: 'Cliente', url: 'https://pago.outrahora.com/action', subject: 'Atualização', message: 'Mensagem',
      eventTitle: 'Evento', eventDate: '2026-08-01T22:00:00.000Z', orderId: 'order-1', total: 10, refundId: 'refund-1',
    }, 'https://pago.outrahora.com/logo-full-blue.svg');
    expect(result.html).toContain('bgcolor="#ffffff"');
    expect(result.html).toContain('#172027');
    expect(result.html).not.toContain('background:#0a0a0a');
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
    expect(result.html).toContain('background:#f4f7f9');
    expect(result.html).toContain('pago.outrahora.com');
  });

  it('renders ORG_ADMIN invitations with a friendly role label', () => {
    const result = renderMail('ORGANIZATION_INVITATION', {
      organizationName: 'Teste Produções', inviterName: 'Super Admin', role: 'ORG_ADMIN', url: 'https://pago.outrahora.com/invite',
    }, 'https://pago.outrahora.com/logo.svg');
    expect(result.html).toContain('Administrador da organização');
    expect(result.text).toContain('Administrador da organização');
  });

  it('omits the custom message block when no invitation message was provided', () => {
    const result = renderMail('ORGANIZATION_INVITATION', {
      organizationName: 'Outra Hora', inviterName: 'Outra Hora', role: 'STAFF', url: 'https://pago.outrahora.com/invite',
    }, 'https://pago.outrahora.com/logo.svg');
    expect(result.text).not.toContain('Mensagem:');
    expect(result.html).toContain('como Staff');
  });
});
