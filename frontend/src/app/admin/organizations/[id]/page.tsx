'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, MailPlus } from 'lucide-react';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { organizationsApi } from '@/lib/api';
import { useOrganization } from '@/lib/organization-context';

const date = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const statusLabel: Record<string,string> = { PENDING: 'Pendente', ACCEPTED: 'Aceito', EXPIRED: 'Expirado', CANCELLED: 'Cancelado' };

export default function OrganizationDetailPage() {
  const id = String(useParams().id);
  const { refresh } = useOrganization();
  const [organization, setOrganization] = useState<any>(null), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({}), [email, setEmail] = useState(''), [customMessage, setCustomMessage] = useState(''), [inviting, setInviting] = useState(false);
  async function load() { setLoading(true); try { const { data } = await organizationsApi.get(id); setOrganization(data.organization); setForm(pick(data.organization)); } catch (e: any) { toast.error(message(e, 'Não foi possível carregar a organização')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [id]);
  async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { const payload = { ...form, website: form.website || null, instagram: form.instagram || null, logoUrl: form.logoUrl || null }; await organizationsApi.update(id, payload); toast.success('Organização atualizada'); await Promise.all([load(), refresh()]); } catch (e: any) { toast.error(message(e, 'Não foi possível atualizar a organização')); } finally { setSaving(false); } }
  async function invite(event: React.FormEvent) { event.preventDefault(); setInviting(true); try { await organizationsApi.createInvitation(id, { email, role: 'ORG_ADMIN', ...(customMessage.trim() && { customMessage: customMessage.trim() }) }); toast.success('Convite para administrador enviado'); setEmail(''); setCustomMessage(''); await load(); } catch (e: any) { toast.error(message(e, 'Não foi possível enviar o convite')); } finally { setInviting(false); } }
  async function invitationAction(action: 'resend'|'cancel', invitation: any) { if (action === 'cancel' && !confirm(`Cancelar o convite para ${invitation.email}?`)) return; try { action === 'resend' ? await organizationsApi.resendInvitation(id, invitation.id) : await organizationsApi.cancelInvitation(id, invitation.id); toast.success(action === 'resend' ? 'Convite reenviado' : 'Convite cancelado'); await load(); } catch (e: any) { toast.error(message(e, 'Não foi possível atualizar o convite')); } }
  if (loading) return <main style={main}><AdminNavigation/><p style={muted}>Carregando...</p></main>;
  if (!organization) return <main style={main}><AdminNavigation/><p>Organização não encontrada.</p></main>;
  const activeAdmins = organization.members.filter((item: any) => item.status === 'ACTIVE');
  return <main style={main}><AdminNavigation/><section style={{ marginTop: 28 }}>
    <Link href="/admin/organizations" style={{ color: '#247d99', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}><ArrowLeft size={15}/>Organizações</Link>
    <div style={heading}><div><h1 style={{ fontSize: 26, marginBottom: 4 }}>{organization.name}</h1><p style={muted}>{organization.slug} · {organization.isActive ? 'Organização ativa' : 'Organização inativa'}</p></div><span style={badge(organization.isActive ? '#287a51' : '#66727a')}>{organization.isActive ? 'Ativa' : 'Inativa'}</span></div>
    {!organization.isActive && <Notice text="A organização está inativa e não concede acesso administrativo aos seus membros."/>}
    <form onSubmit={save} style={card}><h2 style={full}>Dados básicos</h2>
      <Field label="Nome"><input required minLength={2} value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} style={input}/></Field>
      <Field label="Slug"><input required value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} style={input}/></Field>
      <Field label="Website"><input type="url" value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} style={input}/></Field>
      <Field label="Instagram"><input value={form.instagram || ''} onChange={e => setForm({ ...form, instagram: e.target.value })} style={input}/></Field>
      <Field label="Logo (URL)"><input type="url" value={form.logoUrl || ''} onChange={e => setForm({ ...form, logoUrl: e.target.value })} style={input}/></Field>
      <label style={{ ...label, alignSelf: 'end' }}><input type="checkbox" checked={Boolean(form.isActive)} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Organização ativa</label>
      <button disabled={saving} style={button}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
    </form>
    <section style={section}><h2>Administradores</h2>{activeAdmins.length === 0 ? <Notice text={organization.invitations.some((item: any) => item.status === 'PENDING') ? 'A organização ainda não possui administrador ativo. Existe um convite pendente.' : 'Organização sem administrador. Envie o primeiro convite abaixo.'}/> : <div style={list}>{activeAdmins.map((member: any) => <div key={member.id} style={listItem}><div><strong>{member.user.name}</strong><small style={small}>{member.user.email}</small></div><span style={badge(member.user.isVerified ? '#287a51' : '#b33f3f')}>{member.user.isVerified ? 'E-mail verificado' : 'E-mail não verificado'}</span></div>)}</div>}
      <form onSubmit={invite} style={{ ...card, marginTop: 18 }}><h3 style={full}><MailPlus size={18}/> Convidar administrador</h3><Field label="E-mail"><input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={input}/></Field><Field label="Mensagem personalizada (opcional)"><textarea maxLength={250} rows={3} value={customMessage} onChange={e => setCustomMessage(e.target.value)} style={{ ...input, resize: 'vertical' }}/><small style={small}>{customMessage.length}/250</small></Field><button disabled={inviting || !organization.isActive} style={button}>{inviting ? 'Enviando...' : 'Enviar convite para ORG_ADMIN'}</button></form>
    </section>
    <section style={section}><h2>Histórico de convites de administrador</h2>{organization.invitations.length === 0 ? <p style={muted}>Nenhum convite enviado.</p> : <div style={list}>{organization.invitations.map((invitation: any) => <div key={invitation.id} style={listItem}><div><strong>{invitation.email}</strong><small style={small}>Enviado por {invitation.invitedBy.name || organization.name} em {date(invitation.createdAt)} · expira em {date(invitation.expiresAt)}</small></div><div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={badge(invitation.status === 'PENDING' ? '#966800' : invitation.status === 'ACCEPTED' ? '#287a51' : '#66727a')}>{statusLabel[invitation.status]}</span>{invitation.status === 'PENDING' && <><button style={button} onClick={() => invitationAction('resend', invitation)}>Reenviar</button><button style={{ ...button, color: '#b33f3f' }} onClick={() => invitationAction('cancel', invitation)}>Cancelar</button></>}</div></div>)}</div>}</section>
  </section></main>;
}

function pick(org: any) { return { name: org.name, slug: org.slug, website: org.website || '', instagram: org.instagram || '', logoUrl: org.logoUrl || '', isActive: org.isActive }; }
function Field({ label: text, children }: { label: string; children: React.ReactNode }) { return <label style={label}>{text}{children}</label>; }
function Notice({ text }: { text: string }) { return <div style={{ padding: 14, borderRadius: 12, border: '1px solid #d9aa4148', background: '#d9aa4112', color: 'var(--theme-text)', margin: '14px 0' }}>{text}</div>; }
function message(error: any, fallback: string) { const value = error.response?.data?.message; return Array.isArray(value) ? value[0] : value || fallback; }
const badge = (color: string): React.CSSProperties => ({ color, background: `${color}14`, border: `1px solid ${color}38`, borderRadius: 999, padding: '5px 9px', fontSize: 12, whiteSpace: 'nowrap' });
const main: React.CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '24px 16px 48px' };
const heading: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 18 };
const card: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, margin: '22px 0', padding: 18, border: '1px solid var(--theme-border)', borderRadius: 14, background: 'var(--theme-surface)' };
const section: React.CSSProperties = { marginTop: 28, paddingTop: 8 };
const input: React.CSSProperties = { boxSizing: 'border-box', width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)', minWidth: 0 };
const button: React.CSSProperties = { ...input, width: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#247d99', cursor: 'pointer', fontWeight: 650 };
const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13 };
const muted: React.CSSProperties = { color: 'var(--theme-muted)' };
const full: React.CSSProperties = { gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 7, margin: 0 };
const list: React.CSSProperties = { display: 'grid', gap: 10 };
const listItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 14, border: '1px solid var(--theme-border)', borderRadius: 12, background: 'var(--theme-surface)' };
const small: React.CSSProperties = { display: 'block', color: 'var(--theme-muted)', marginTop: 4 };
