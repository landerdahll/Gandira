export type MailTemplateName = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'ORDER_CONFIRMATION' | 'TRANSFER' | 'REFUND_CONFIRMATION' | 'ORGANIZATION_INVITATION';

export interface RenderedMail { subject: string; html: string; text: string }

const escape = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const money = (value: unknown) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (value: unknown) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
}).format(new Date(String(value)));

function button(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td bgcolor="#67bed9" style="border-radius:12px;background:#67bed9;text-align:center"><a href="${escape(url)}" target="_blank" style="display:block;padding:14px 24px;color:#172027!important;font-size:15px;font-weight:700;text-decoration:none">${escape(label)}</a></td></tr></table>`;
}

function layout(title: string, content: string, text: string, logoUrl: string): RenderedMail {
  const html = `<!doctype html><html lang="pt-BR" style="color-scheme:light;supported-color-schemes:light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light;supported-color-schemes:light}a{color:#287f9a}@media(prefers-color-scheme:dark){.pago-bg{background:#f4f7f9!important}.pago-card,.pago-cell{background:#ffffff!important;color:#172027!important}.pago-muted{color:#52606a!important}}</style></head><body class="pago-bg" bgcolor="#f4f7f9" style="margin:0;background:#f4f7f9!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#172027!important"><table class="pago-bg" role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f7f9" style="background:#f4f7f9!important;padding:24px 12px"><tr><td align="center" bgcolor="#f4f7f9"><table class="pago-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:520px;background:#ffffff!important;border:1px solid #dce7ec;border-radius:16px;color:#172027!important"><tr><td class="pago-cell" bgcolor="#ffffff" style="padding:24px 28px;border-bottom:1px solid #dce7ec;background:#ffffff!important;color:#172027!important"><img src="${escape(logoUrl)}" alt="Pago" height="36" style="display:block;height:36px;max-width:180px"><span style="display:none;color:#172027">Pago</span></td></tr><tr><td class="pago-cell" bgcolor="#ffffff" style="padding:28px;background:#ffffff!important;color:#172027!important"><h1 style="margin:0 0 18px;color:#172027!important;font-size:22px;line-height:1.3">${escape(title)}</h1>${content}</td></tr><tr><td class="pago-cell pago-muted" bgcolor="#ffffff" style="padding:18px 28px;border-top:1px solid #dce7ec;background:#ffffff!important;color:#52606a!important;font-size:12px;text-align:center"><a href="https://pago.outrahora.com" style="color:#287f9a!important">pago.outrahora.com</a></td></tr></table></td></tr></table></body></html>`;
  return { subject: title, html, text: `${title}\n\n${text}\n\nhttps://pago.outrahora.com` };
}

export function renderMail(template: MailTemplateName, payload: Record<string, any>, logoUrl: string): RenderedMail {
  if (template === 'ORGANIZATION_INVITATION') {
    const role = payload.role === 'ORG_ADMIN' ? 'Administrador da organização' : payload.role === 'PRODUCER' ? 'Produtor' : 'Staff';
    const inviter = String(payload.inviterName || payload.organizationName);
    const subject = `Convite para a equipe da ${payload.organizationName}`;
    const copy = `${inviter} convidou você para fazer parte da equipe da ${payload.organizationName} como ${role}.`;
    const customMessage = payload.customMessage
      ? `<div style="margin:18px 0;padding:14px 16px;border-left:3px solid #67bed9;background:#f4fbfd;color:#333;line-height:1.6">${escape(payload.customMessage)}</div>`
      : '';
    const content = `<p style="color:#555;line-height:1.6">${escape(copy)}</p>${customMessage}<p style="color:#555;line-height:1.6">O convite é válido por 30 dias. Se você ainda não possui uma conta, poderá criar uma usando este mesmo e-mail.</p>${button('Aceitar convite', payload.url)}<p style="color:#777;font-size:12px;word-break:break-all">Link alternativo: <a href="${escape(payload.url)}" style="color:#247d99">${escape(payload.url)}</a></p>`;
    const customText = payload.customMessage ? `\n\nMensagem: ${payload.customMessage}` : '';
    return layout(subject, content, `${copy}${customText}\n\nO convite é válido por 30 dias.\nAceitar convite: ${payload.url}`, logoUrl);
  }
  if (template === 'EMAIL_VERIFICATION') {
    const subject = 'Confirme seu e-mail — Pago';
    const copy = `Olá, ${payload.name}. Confirme seu e-mail para liberar a compra de ingressos. O link é válido por 24 horas.`;
    return layout(subject, `<p class="pago-muted" style="color:#52606a!important;line-height:1.6">${escape(copy)}</p>${button('Confirmar e-mail', payload.url)}<p class="pago-muted" style="color:#52606a!important;font-size:12px;word-break:break-all">Link alternativo: <a href="${escape(payload.url)}" style="color:#287f9a!important">${escape(payload.url)}</a></p>`, `${copy}\n\nConfirmar e-mail: ${payload.url}`, logoUrl);
  }
  if (template === 'PASSWORD_RESET') {
    const subject = 'Redefinição de senha — Pago';
    const copy = `Olá, ${payload.name}. Use o link abaixo para criar uma nova senha. Ele é válido por 1 hora.`;
    return layout(subject, `<p class="pago-muted" style="color:#52606a!important;line-height:1.6">${escape(copy)}</p>${button('Redefinir senha', payload.url)}<p class="pago-muted" style="color:#52606a!important;font-size:12px;word-break:break-all">Link alternativo: <a href="${escape(payload.url)}" style="color:#287f9a!important">${escape(payload.url)}</a></p>`, `${copy}\n\nRedefinir senha: ${payload.url}`, logoUrl);
  }
  if (template === 'ORDER_CONFIRMATION') {
    const subject = `Ingresso confirmado — ${payload.eventTitle}`;
    const rows = (payload.items ?? []).map((item: any) => `<tr><td style="padding:8px 0;border-bottom:1px solid #dce7ec;color:#172027!important">${escape(item.batchName)}</td><td style="text-align:right;border-bottom:1px solid #dce7ec;color:#172027!important">${escape(item.quantity)}</td></tr>`).join('');
    const itemsText = (payload.items ?? []).map((item: any) => `${item.batchName}: ${item.quantity}`).join('\n');
    const detail = `${dateTime(payload.eventDate)} · ${payload.venue}${payload.city ? ` · ${payload.city}` : ''}`;
    const content = `<p class="pago-muted" style="color:#52606a!important;line-height:1.6">Olá, ${escape(payload.name)}. Seu pagamento foi aprovado e seus ingressos estão disponíveis no Pago.</p><div bgcolor="#eef8fb" style="background:#eef8fb!important;border:1px solid #c9e7f0;border-radius:12px;padding:18px;color:#172027!important"><strong>${escape(payload.eventTitle)}</strong><p style="color:#287f9a!important;margin:8px 0 0">${escape(detail)}</p></div><table width="100%" style="margin:18px 0;border-collapse:collapse;color:#172027!important">${rows}</table><p style="color:#172027!important"><strong>Total:</strong> ${escape(money(payload.total))}<br><strong>Pedido:</strong> ${escape(payload.orderId)}</p>${button('Ver meus ingressos', payload.myTicketsUrl)}<p class="pago-muted" style="color:#52606a!important;font-size:12px;word-break:break-all">Link alternativo: <a href="${escape(payload.myTicketsUrl)}" style="color:#287f9a!important">${escape(payload.myTicketsUrl)}</a></p>`;
    return layout(subject, content, `Olá, ${payload.name}. Seu pagamento foi aprovado.\nEvento: ${payload.eventTitle}\nData e horário: ${detail}\n${itemsText}\nTotal: ${money(payload.total)}\nPedido: ${payload.orderId}\nVer meus ingressos: ${payload.myTicketsUrl}`, logoUrl);
  }
  if (template === 'REFUND_CONFIRMATION') {
    const subject = `Cancelamento confirmado — ${payload.eventTitle}`;
    const copy = `Olá, ${payload.name}. O pedido ${payload.orderId} foi cancelado. O reembolso de ${money(payload.total)} foi solicitado para o mesmo meio de pagamento.`;
    return layout(subject, `<p class="pago-muted" style="color:#52606a!important;line-height:1.6">${escape(copy)}</p><p style="color:#172027!important">Evento: ${escape(payload.eventTitle)}<br>Data: ${escape(dateTime(payload.eventDate))}<br>Referência: ${escape(payload.refundId)}</p>`, `${copy}\nEvento: ${payload.eventTitle}\nData: ${dateTime(payload.eventDate)}\nReferência: ${payload.refundId}`, logoUrl);
  }
  const subject = String(payload.subject ?? 'Atualização sobre seu ingresso');
  const message = String(payload.message ?? 'Há uma atualização sobre seu ingresso no Pago.');
  const action = payload.actionUrl ? `${button(payload.actionLabel ?? 'Abrir no Pago', payload.actionUrl)}<p class="pago-muted" style="color:#52606a!important;font-size:12px;word-break:break-all">${escape(payload.actionUrl)}</p>` : '';
  return layout(subject, `<p class="pago-muted" style="color:#52606a!important;line-height:1.6">${escape(message)}</p>${action}`, `${message}${payload.actionUrl ? `\n\n${payload.actionUrl}` : ''}`, logoUrl);
}
