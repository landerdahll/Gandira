'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus } from 'lucide-react';
import { organizationsApi } from '@/lib/api';
import { useOrganization } from '@/lib/organization-context';
import { AdminNavigation } from '@/components/admin/admin-navigation';

export default function AdminOrganizationsPage() {
  const { refresh } = useOrganization();
  const [rows, setRows] = useState<any[]>([]), [loading, setLoading] = useState(true), [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(''), [slug, setSlug] = useState(''), [saving, setSaving] = useState(false);
  async function load() { setLoading(true); try { setRows((await organizationsApi.adminList()).data); } catch (e: any) { toast.error(e.response?.data?.message || 'Não foi possível carregar as organizações'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function create(event: React.FormEvent) { event.preventDefault(); setSaving(true); try { await organizationsApi.create({ name, ...(slug && { slug }) }); toast.success('Organização criada'); setName(''); setSlug(''); setShowForm(false); await Promise.all([load(), refresh()]); } catch (e: any) { toast.error(e.response?.data?.message || 'Não foi possível criar a organização'); } finally { setSaving(false); } }
  async function toggle(row: any) { if (!confirm(`${row.isActive ? 'Desativar' : 'Ativar'} a organização ${row.name}?`)) return; try { await organizationsApi.update(row.id, { isActive: !row.isActive }); toast.success('Organização atualizada'); await Promise.all([load(), refresh()]); } catch (e: any) { toast.error(e.response?.data?.message || 'Não foi possível atualizar a organização'); } }
  return <main style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px 48px' }}><AdminNavigation/><section style={{ marginTop: 28 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h1 style={{ fontSize: 26 }}>Organizações</h1><p style={{ color: 'var(--theme-muted)' }}>Gestão global de produtoras pelo Super Administrador.</p></div><button onClick={() => setShowForm(!showForm)} style={button}><Plus size={16}/>Nova organização</button></div>
    {showForm && <form onSubmit={create} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, margin: '20px 0', padding: 16, border: '1px solid var(--theme-border)', borderRadius: 14, background: 'var(--theme-surface)' }}><input required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Nome da organização" style={input}/><input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="slug-opcional" style={input}/><button disabled={saving} style={button}>{saving ? 'Criando...' : 'Criar'}</button></form>}
    {loading ? <p style={{ color: 'var(--theme-muted)' }}>Carregando...</p> : rows.length === 0 ? <div style={empty}><Building2 size={34}/><strong>Nenhuma organização cadastrada</strong><span>Crie a primeira organização para iniciar a operação.</span></div> : <div style={{ overflowX: 'auto', border: '1px solid var(--theme-border)', borderRadius: 14 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Organização','Slug','Membros','Eventos','Convites','Status','Ações'].map(label => <th key={label} style={th}>{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id} style={{ borderTop: '1px solid var(--theme-border)' }}><td style={td}><strong>{row.name}</strong></td><td style={td}>{row.slug}</td><td style={td}>{row._count.members}</td><td style={td}>{row._count.events}</td><td style={td}>{row._count.invitations}</td><td style={td}>{row.isActive ? 'Ativa' : 'Inativa'}</td><td style={td}><button onClick={() => toggle(row)} style={{ ...button, color: row.isActive ? '#c94d4d' : '#3d9d68' }}>{row.isActive ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody></table></div>}
  </section></main>;
}
const input: React.CSSProperties = { padding: '10px 12px', borderRadius: 9, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)', minWidth: 0 };
const button: React.CSSProperties = { ...input, display: 'inline-flex', alignItems: 'center', gap: 6, color: '#247d99', cursor: 'pointer', fontWeight: 650 };
const th: React.CSSProperties = { padding: 12, textAlign: 'left', color: 'var(--theme-muted)', fontSize: 12 };
const td: React.CSSProperties = { padding: 12, fontSize: 13 };
const empty: React.CSSProperties = { padding: 48, display: 'grid', placeItems: 'center', gap: 10, color: 'var(--theme-muted)', border: '1px dashed var(--theme-border)', borderRadius: 14 };
