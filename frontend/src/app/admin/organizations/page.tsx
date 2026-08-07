'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Building2, Plus, Search } from 'lucide-react';
import { organizationsApi } from '@/lib/api';
import { useOrganization } from '@/lib/organization-context';
import { AdminNavigation } from '@/components/admin/admin-navigation';

const emptyForm = { name: '', slug: '', website: '', instagram: '', logoUrl: '', isActive: true };

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const { refresh } = useOrganization();
  const [rows, setRows] = useState<any[]>([]), [loading, setLoading] = useState(true), [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState(''), [status, setStatus] = useState('ALL'), [form, setForm] = useState(emptyForm), [saving, setSaving] = useState(false);
  async function load() { setLoading(true); try { setRows((await organizationsApi.adminList()).data); } catch (e: any) { toast.error(message(e, 'Não foi possível carregar as organizações')); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => rows.filter(row => `${row.name} ${row.slug}`.toLowerCase().includes(search.toLowerCase()) && (status === 'ALL' || String(row.isActive) === status)), [rows, search, status]);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
      const { data } = await organizationsApi.create(payload);
      toast.success('Organização criada. Agora convide o primeiro administrador.');
      setForm(emptyForm); setShowForm(false); await Promise.all([load(), refresh()]);
      router.push(`/admin/organizations/${data.id}`);
    } catch (e: any) { toast.error(message(e, 'Não foi possível criar a organização')); }
    finally { setSaving(false); }
  }
  return <main style={main}><AdminNavigation/><section style={{ marginTop: 28 }}>
    <div style={heading}><div><h1 style={{ fontSize: 26 }}>Organizações</h1><p style={muted}>Gestão global de produtoras pelo Super Administrador.</p></div><button onClick={() => setShowForm(!showForm)} style={button}><Plus size={16}/>Nova organização</button></div>
    {showForm && <form onSubmit={create} style={card}>
      <Field label="Nome"><input required minLength={2} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={input}/></Field>
      <Field label="Slug"><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="gerado automaticamente" style={input}/></Field>
      <Field label="Website (opcional)"><input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} style={input}/></Field>
      <Field label="Instagram (opcional)"><input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} style={input}/></Field>
      <Field label="Logo (URL opcional)"><input type="url" value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} style={input}/></Field>
      <label style={{ ...label, alignSelf: 'end' }}><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })}/> Organização ativa</label>
      <button disabled={saving} style={button}>{saving ? 'Criando...' : 'Criar e configurar administrador'}</button>
    </form>}
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '22px 0' }}><div style={{ position: 'relative', flex: '1 1 240px' }}><Search size={15} style={{ position: 'absolute', left: 11, top: 12 }}/><input aria-label="Buscar organizações" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou slug" style={{ ...input, width: '100%', paddingLeft: 34 }}/></div><select aria-label="Filtrar status" value={status} onChange={e => setStatus(e.target.value)} style={input}><option value="ALL">Todos os status</option><option value="true">Ativas</option><option value="false">Inativas</option></select></div>
    {loading ? <p style={muted}>Carregando...</p> : filtered.length === 0 ? <div style={empty}><Building2 size={34}/><strong>Nenhuma organização encontrada</strong><span>Ajuste os filtros ou crie uma nova organização.</span></div> : <div style={tableWrap}><table style={table}><thead><tr>{['Organização','Membros','Eventos','Administração','Status','Ações'].map(item => <th key={item} style={th}>{item}</th>)}</tr></thead><tbody>{filtered.map(row => { const adminState = row.members.length ? 'Admin ativo' : row.invitations.length ? 'Convite pendente' : 'Sem administrador'; return <tr key={row.id} style={rowStyle}><td style={td}><strong>{row.name}</strong><small style={small}>{row.slug}</small></td><td style={td}>{row._count.members}</td><td style={td}>{row._count.events}</td><td style={td}><Status text={adminState} tone={row.members.length ? 'ok' : row.invitations.length ? 'warn' : 'danger'}/></td><td style={td}><Status text={row.isActive ? 'Ativa' : 'Inativa'} tone={row.isActive ? 'ok' : 'muted'}/></td><td style={td}><button onClick={() => router.push(`/admin/organizations/${row.id}`)} style={button}>Abrir detalhes</button></td></tr>; })}</tbody></table></div>}
  </section></main>;
}

function Field({ label: text, children }: { label: string; children: React.ReactNode }) { return <label style={label}>{text}{children}</label>; }
function Status({ text, tone }: { text: string; tone: string }) { const colors: any = { ok: '#287a51', warn: '#966800', danger: '#b33f3f', muted: '#66727a' }; return <span style={{ color: colors[tone], background: `${colors[tone]}14`, border: `1px solid ${colors[tone]}38`, borderRadius: 999, padding: '4px 8px', whiteSpace: 'nowrap' }}>{text}</span>; }
function message(error: any, fallback: string) { const value = error.response?.data?.message; return Array.isArray(value) ? value[0] : value || fallback; }
const main: React.CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: '24px 16px 48px' };
const heading: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const card: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, margin: '20px 0', padding: 18, border: '1px solid var(--theme-border)', borderRadius: 14, background: 'var(--theme-surface)' };
const input: React.CSSProperties = { boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)', minWidth: 0 };
const button: React.CSSProperties = { ...input, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#247d99', cursor: 'pointer', fontWeight: 650 };
const label: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 13 };
const muted: React.CSSProperties = { color: 'var(--theme-muted)' };
const empty: React.CSSProperties = { padding: 48, display: 'grid', placeItems: 'center', gap: 10, color: 'var(--theme-muted)', border: '1px dashed var(--theme-border)', borderRadius: 14 };
const tableWrap: React.CSSProperties = { overflowX: 'auto', border: '1px solid var(--theme-border)', borderRadius: 14 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const th: React.CSSProperties = { padding: 12, textAlign: 'left', color: 'var(--theme-muted)', fontSize: 12, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: 12, fontSize: 13 };
const rowStyle: React.CSSProperties = { borderTop: '1px solid var(--theme-border)' };
const small: React.CSSProperties = { display: 'block', color: 'var(--theme-muted)', marginTop: 3 };
