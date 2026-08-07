'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MailPlus, Search } from 'lucide-react';
import { organizationsApi } from '@/lib/api';
import { useOrganization } from '@/lib/organization-context';

const ROLE_LABEL: Record<string,string> = { ORG_ADMIN: 'Administrador', PRODUCER: 'Produtor', STAFF: 'Staff' };
const STATUS_LABEL: Record<string,string> = { PENDING: 'Pendente', ACCEPTED: 'Aceito', EXPIRED: 'Expirado', CANCELLED: 'Cancelado' };
const date = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function OrganizationMembersPage() {
  const { active, isSuperAdmin, canViewMembers, canManageMembers, canManageInvitations } = useOrganization();
  const organizationId = active?.organization.id;
  const [members, setMembers] = useState<any[]>([]), [invitations, setInvitations] = useState<any[]>([]);
  const [search, setSearch] = useState(''), [status, setStatus] = useState(''), [loading, setLoading] = useState(true), [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState(''), [role, setRole] = useState<'PRODUCER'|'STAFF'>('PRODUCER'), [customMessage, setCustomMessage] = useState(''), [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!organizationId || !canViewMembers) return;
    setLoading(true);
    try {
      const requests: Promise<any>[] = [organizationsApi.members(organizationId, { search: search || undefined, status: status || undefined, limit: 100 })];
      if (canManageInvitations) requests.push(organizationsApi.invitations(organizationId));
      const responses = await Promise.all(requests);
      setMembers(responses[0].data.data);
      setInvitations(responses[1]?.data || []);
    } catch { toast.error('Não foi possível carregar a equipe'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [organizationId, canViewMembers, canManageInvitations]);

  async function createInvitation(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      await organizationsApi.createInvitation(organizationId!, { email, role, ...(customMessage.trim() && { customMessage: customMessage.trim() }) });
      toast.success('Convite enviado'); setEmail(''); setRole('PRODUCER'); setCustomMessage(''); setShowInvite(false); await load();
    } catch (error: any) { toast.error(message(error, 'Não foi possível enviar o convite')); }
    finally { setSubmitting(false); }
  }
  async function invitationAction(action: 'resend'|'cancel', invitation: any) {
    try {
      if (action === 'cancel' && !confirm(`Cancelar o convite de ${invitation.email}?`)) return;
      if (action === 'resend') await organizationsApi.resendInvitation(organizationId!, invitation.id);
      else await organizationsApi.cancelInvitation(organizationId!, invitation.id);
      toast.success(action === 'resend' ? 'Convite reenviado' : 'Convite cancelado'); await load();
    } catch (error: any) { toast.error(message(error, 'Não foi possível atualizar o convite')); }
  }
  async function changeInvitationRole(invitation: any, nextRole: 'PRODUCER'|'STAFF') {
    try { await organizationsApi.changeInvitationRole(organizationId!, invitation.id, nextRole); toast.success('Cargo do convite atualizado'); await load(); }
    catch (error: any) { toast.error(message(error, 'Não foi possível alterar o cargo')); }
  }
  async function changeRole(member: any, nextRole: string) { try { await organizationsApi.changeMemberRole(organizationId!, member.id, nextRole); toast.success('Cargo atualizado'); await load(); } catch (error: any) { toast.error(message(error, 'Não foi possível alterar o cargo')); } }
  async function changeStatus(member: any, nextStatus: string) { try { await organizationsApi.changeMemberStatus(organizationId!, member.id, nextStatus); toast.success(nextStatus === 'ACTIVE' ? 'Membro ativado' : 'Membro desativado'); await load(); } catch (error: any) { toast.error(message(error, 'Não foi possível alterar o status')); } }
  async function remove(member: any) { if (!confirm(`Desativar ${member.user.name}? O histórico será preservado.`)) return; try { await organizationsApi.removeMember(organizationId!, member.id); toast.success('Membro removido da equipe e histórico preservado'); await load(); } catch (error: any) { toast.error(message(error, 'Não foi possível remover o membro')); } }

  if (!canViewMembers) return <p>Você não possui permissão para visualizar a equipe.</p>;
  return <section>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}><div><h1 style={{ fontSize: 26 }}>Equipe</h1><p style={{ color: 'var(--theme-muted)' }}>Membros e convites da organização.</p></div>{canManageInvitations && <button onClick={() => setShowInvite(!showInvite)} style={button}><MailPlus size={16}/>Convidar membro</button>}</div>
    {showInvite && <form onSubmit={createInvitation} style={inviteCard}><div><label style={label}>E-mail</label><input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={input}/></div><div><label style={label}>Cargo</label><select value={role} onChange={e => setRole(e.target.value as any)} style={input}><option value="PRODUCER">Produtor</option><option value="STAFF">Staff</option></select></div><div style={{ gridColumn: '1/-1' }}><label style={label}>Mensagem personalizada <span style={{ color: 'var(--theme-muted)' }}>(opcional)</span></label><textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} maxLength={250} rows={3} style={{ ...input, width: '100%', resize: 'vertical' }}/><small style={small}>{customMessage.length}/250</small></div><button disabled={submitting} style={button}>{submitting ? 'Enviando...' : 'Enviar convite'}</button></form>}
    <div style={{ display: 'flex', gap: 8, margin: '22px 0', flexWrap: 'wrap' }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou e-mail" style={input}/><select value={status} onChange={e => setStatus(e.target.value)} style={input}><option value="">Todos os status</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select><button onClick={load} style={button}><Search size={15}/>Buscar</button></div>
    {loading ? <p style={{ color: 'var(--theme-muted)' }}>Carregando...</p> : <>
      {members.length === 0 ? <EmptyState text="Nenhum membro encontrado com estes filtros."/> : <Table headers={['Membro','Cargo','Status','Desde','Ações']}>{members.map(member => <tr key={member.id} style={row}><td style={td}><strong>{member.user.name}</strong><small style={small}>{member.user.email}</small></td><td style={td}>{canManageMembers ? <select value={member.role} onChange={e => changeRole(member,e.target.value)} style={input}>{Object.entries(ROLE_LABEL).filter(([value]) => isSuperAdmin || value !== 'ORG_ADMIN' || member.role === 'ORG_ADMIN').map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select> : ROLE_LABEL[member.role]}</td><td style={td}>{member.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</td><td style={td}>{date(member.createdAt)}</td><td style={td}>{canManageMembers ? member.status === 'ACTIVE' ? <><button style={secondaryButton} onClick={() => changeStatus(member,'INACTIVE')}>Desativar</button> <button style={dangerButton} onClick={() => remove(member)}>Remover</button></> : <button style={secondaryButton} onClick={() => changeStatus(member,'ACTIVE')}>Reativar</button> : 'Somente leitura'}</td></tr>)}</Table>}
      {canManageInvitations && <><h2 style={{ fontSize: 20, marginTop: 32 }}>Convites</h2>{invitations.length === 0 ? <EmptyState text="Nenhum convite encontrado."/> : <Table headers={['Convidado','Cargo','Convidado por','Convite','Expiração','Status','Ações']}>{invitations.map(invitation => <tr key={invitation.id} style={row}><td style={td}><strong>{invitation.accountName || 'Conta ainda não criada'}</strong><small style={small}>{invitation.email}</small></td><td style={td}>{invitation.status === 'PENDING' ? <select value={invitation.role} onChange={e => changeInvitationRole(invitation,e.target.value as any)} style={input}><option value="PRODUCER">Produtor</option><option value="STAFF">Staff</option></select> : ROLE_LABEL[invitation.role]}</td><td style={td}>{invitation.invitedBy.name || active?.organization.name}</td><td style={td}>{date(invitation.createdAt)}</td><td style={td}>{date(invitation.expiresAt)}</td><td style={td}>{STATUS_LABEL[invitation.status]}</td><td style={td}>{invitation.status === 'PENDING' ? <><button style={secondaryButton} onClick={() => invitationAction('resend',invitation)}>Reenviar</button> <button style={dangerButton} onClick={() => invitationAction('cancel',invitation)}>Cancelar</button></> : '—'}</td></tr>)}</Table>}</>}
    </>}
  </section>;
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div style={{ overflowX: 'auto', border: '1px solid var(--theme-border)', borderRadius: 14 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{headers.map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function EmptyState({ text }: { text: string }) { return <div style={{ padding: 28, textAlign: 'center', color: 'var(--theme-muted)', border: '1px dashed var(--theme-border)', borderRadius: 14 }}>{text}</div>; }
function message(error: any, fallback: string) { const value = error.response?.data?.message; return Array.isArray(value) ? value[0] : value || fallback; }
const input: React.CSSProperties = { background: 'var(--theme-surface)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)', borderRadius: 9, padding: '9px 11px' };
const button: React.CSSProperties = { ...input, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#247d99', fontWeight: 600 };
const secondaryButton: React.CSSProperties = { ...button, padding: '7px 9px', color: 'var(--theme-text)' };
const dangerButton: React.CSSProperties = { ...secondaryButton, color: '#c94d4d' };
const inviteCard: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, padding: 18, marginTop: 20, background: 'var(--theme-surface)', border: '1px solid var(--theme-border)', borderRadius: 14 };
const label: React.CSSProperties = { display: 'block', fontSize: 13, marginBottom: 6 };
const th: React.CSSProperties = { textAlign: 'left', padding: 12, color: 'var(--theme-muted)', fontSize: 12, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: 12, fontSize: 13, verticalAlign: 'middle', whiteSpace: 'nowrap' };
const row: React.CSSProperties = { borderTop: '1px solid var(--theme-border)' };
const small: React.CSSProperties = { display: 'block', color: 'var(--theme-muted)', marginTop: 3 };
