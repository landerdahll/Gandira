'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import { organizationsApi } from '@/lib/api';
import { useOrganization } from '@/lib/organization-context';

const ROLE_LABEL: Record<string,string> = { ORG_ADMIN: 'Administrador', PRODUCER: 'Produtor', STAFF: 'Staff' };
export default function OrganizationMembersPage() {
  const { active, canViewMembers, canManageMembers } = useOrganization();
  const [members, setMembers] = useState<any[]>([]), [search, setSearch] = useState(''), [status, setStatus] = useState(''), [loading, setLoading] = useState(true);
  const organizationId = active?.organization.id;
  async function load() { if (!organizationId || !canViewMembers) return; setLoading(true); try { const { data } = await organizationsApi.members(organizationId, { search: search || undefined, status: status || undefined, limit: 100 }); setMembers(data.data); } catch { toast.error('Não foi possível carregar a equipe'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [organizationId, canViewMembers]);
  async function changeRole(member: any, role: string) { try { await organizationsApi.changeMemberRole(organizationId!, member.id, role); toast.success('Cargo atualizado'); await load(); } catch (error: any) { toast.error(error.response?.data?.message || 'Não foi possível alterar o cargo'); } }
  async function changeStatus(member: any, nextStatus: string) { try { await organizationsApi.changeMemberStatus(organizationId!, member.id, nextStatus); toast.success(nextStatus === 'ACTIVE' ? 'Membro ativado' : 'Membro desativado'); await load(); } catch (error: any) { toast.error(error.response?.data?.message || 'Não foi possível alterar o status'); } }
  async function remove(member: any) { if (!confirm(`Desativar ${member.user.name}? O histórico será preservado.`)) return; try { await organizationsApi.removeMember(organizationId!, member.id); toast.success('Membro removido da equipe e histórico preservado'); await load(); } catch (error: any) { toast.error(error.response?.data?.message || 'Não foi possível remover o membro'); } }
  if (!canViewMembers) return <p>Você não possui permissão para visualizar a equipe.</p>;
  return <section><h1 style={{ fontSize: 26 }}>Equipe</h1><p style={{ color: 'var(--theme-muted)' }}>ORG_ADMIN, PRODUCER e STAFF vinculados à organização. Membros desativados permanecem no histórico.</p>
    <div style={{ display: 'flex', gap: 8, margin: '22px 0', flexWrap: 'wrap' }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou e-mail" style={input}/><select value={status} onChange={e => setStatus(e.target.value)} style={input}><option value="">Todos os status</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option></select><button onClick={load} style={button}><Search size={15}/>Buscar</button></div>
    {loading ? <p style={{ color: 'var(--theme-muted)' }}>Carregando...</p> : <div style={{ overflowX: 'auto', border: '1px solid var(--theme-border)', borderRadius: 14 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Membro','Cargo','Status','Desde','Ações'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{members.map(member => <tr key={member.id} style={{ borderTop: '1px solid var(--theme-border)' }}><td style={td}><strong>{member.user.name}</strong><small style={small}>{member.user.email}</small></td><td style={td}>{canManageMembers ? <select value={member.role} onChange={e => changeRole(member,e.target.value)} style={input}>{Object.entries(ROLE_LABEL).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select> : ROLE_LABEL[member.role]}</td><td style={td}><span style={{ color: member.status === 'ACTIVE' ? '#49b675' : '#999' }}>{member.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</span></td><td style={td}>{new Date(member.createdAt).toLocaleDateString('pt-BR')}</td><td style={td}>{canManageMembers ? <div style={{ display: 'flex', gap: 7 }}>{member.status === 'ACTIVE' ? <><button style={secondaryButton} onClick={() => changeStatus(member,'INACTIVE')}>Desativar</button><button style={dangerButton} onClick={() => remove(member)}>Remover</button></> : <button style={secondaryButton} onClick={() => changeStatus(member,'ACTIVE')}>Reativar</button>}</div> : 'Somente leitura'}</td></tr>)}</tbody></table></div>}
  </section>;
}
const input: React.CSSProperties = { background: 'var(--theme-surface)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)', borderRadius: 9, padding: '9px 11px' };
const button: React.CSSProperties = { ...input, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#67bed9' };
const secondaryButton: React.CSSProperties = { ...button, padding: '7px 9px', color: 'var(--theme-text)' };
const dangerButton: React.CSSProperties = { ...secondaryButton, color: '#dc6262' };
const th: React.CSSProperties = { textAlign: 'left', padding: 12, color: 'var(--theme-muted)', fontSize: 12 };
const td: React.CSSProperties = { padding: 12, fontSize: 13, verticalAlign: 'middle' };
const small: React.CSSProperties = { display: 'block', color: 'var(--theme-muted)', marginTop: 3 };
