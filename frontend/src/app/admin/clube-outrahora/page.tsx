'use client';

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircle2, ChevronLeft, ChevronRight, CircleOff, Link2, Plus,
  Search, ShieldCheck, UserRound, Users, X,
} from 'lucide-react';
import { clubMembersApi } from '@/lib/api';
import { AdminNavigation } from '@/components/admin/admin-navigation';

interface LinkedAccount {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface BenefitUsage {
  id: string;
  status: 'RESERVED' | 'CONFIRMED' | 'RELEASED';
  event: { id: string; title: string };
  batch?: { id: string; name: string } | null;
  reservedOrder?: { id: string; status: string } | null;
  confirmedOrder?: { id: string; status: string } | null;
  originalAmount?: string | number | null;
  discountAmount?: string | number | null;
  finalAmount?: string | number | null;
  reservedAt?: string | null;
  reservationExpiresAt?: string | null;
  confirmedAt?: string | null;
  releasedAt?: string | null;
  releaseReason?: string | null;
}

interface ClubMember {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  isActive: boolean;
  activatedAt?: string | null;
  deactivatedAt?: string | null;
  createdAt: string;
  hasLinkedAccount: boolean;
  linkedAccount?: LinkedAccount | null;
  usages?: BenefitUsage[];
}

const emptyForm = { name: '', email: '', phone: '' };

export default function ClubeOutrahoraPage() {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, lastPage: 1 });
  const [summary, setSummary] = useState({ active: 0, inactive: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<ClubMember | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await clubMembersApi.list({
          page,
          limit: 20,
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        if (!active) return;
        setMembers(response.data.data);
        setMeta(response.data.meta);
        setSummary(response.data.summary);
      } catch (error: any) {
        if (active) toast.error(apiMessage(error, 'Erro ao carregar membros do Clube'));
      } finally {
        if (active) setLoading(false);
      }
    }, search.trim() ? 400 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [page, search, refreshKey]);

  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      setDetail((await clubMembersApi.get(id)).data);
    } catch (error: any) {
      toast.error(error.response?.status === 404
        ? 'Membro do Clube não encontrado'
        : apiMessage(error, 'Erro ao consultar membro'));
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitMember(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await clubMembersApi.create({
        email: form.email.trim(),
        ...(form.name.trim() ? { name: form.name.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone } : {}),
      });
      toast.success('Membro cadastrado com sucesso');
      setCreateOpen(false);
      setForm(emptyForm);
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (error: any) {
      toast.error(error.response?.status === 409
        ? 'Este e-mail já está cadastrado no Clube Outrahora'
        : apiMessage(error, 'Erro ao cadastrar membro'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(member: ClubMember) {
    const action = member.isActive ? 'desativar' : 'ativar';
    if (!confirm(`Deseja ${action} ${member.name || 'este membro'}?`)) return;
    setActing(member.id);
    try {
      const response = member.isActive
        ? await clubMembersApi.deactivate(member.id)
        : await clubMembersApi.activate(member.id);
      toast.success(`Membro ${member.isActive ? 'desativado' : 'ativado'} com sucesso`);
      if (detail?.id === member.id) setDetail(response.data);
      setRefreshKey((value) => value + 1);
    } catch (error: any) {
      toast.error(error.response?.status === 404
        ? 'Membro do Clube não encontrado'
        : apiMessage(error, `Erro ao ${action} membro`));
    } finally {
      setActing(null);
    }
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 80px', color: '#fff' }}>
      <AdminNavigation />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, margin: '26px 0 24px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={22} color="#67bed9" />
            <h1 style={{ fontSize: 25, fontWeight: 800 }}>Clube Outrahora</h1>
          </div>
          <p style={{ color: '#666', fontSize: 14, marginTop: 5 }}>Gestão da lista de benefícios por e-mail</p>
        </div>
        <button onClick={() => setCreateOpen(true)} style={primaryButton}>
          <Plus size={16} /> Cadastrar membro
        </button>
      </div>

      <div className="club-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 24 }}>
        <SummaryCard label="Membros ativos" value={summary.active} icon={<CheckCircle2 size={18} />} color="#67bed9" />
        <SummaryCard label="Membros inativos" value={summary.inactive} icon={<CircleOff size={18} />} color="#888" />
        <SummaryCard label="Total de membros" value={summary.total} icon={<Users size={18} />} color="#fff" />
      </div>

      <div style={{ position: 'relative', marginBottom: 18 }}>
        <Search size={16} color="#555" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone..."
          style={{ ...inputStyle, width: '100%', paddingLeft: 42, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ border: '1px solid #222', borderRadius: 15, overflow: 'hidden', background: '#101010' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>Carregando membros...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <UserRound size={34} color="#333" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#666' }}>Nenhum membro encontrado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
              <thead><tr>{['Membro', 'E-mail', 'Telefone', 'Conta vinculada', 'Status', 'Ações'].map((title) => <th key={title} style={th}>{title}</th>)}</tr></thead>
              <tbody>{members.map((member) => (
                <tr key={member.id} style={{ borderTop: '1px solid #1d1d1d' }}>
                  <td style={td}>
                    <button onClick={() => openDetail(member.id)} style={memberButton}>{member.name || 'Nome não informado'}</button>
                    <small style={small}>{member.email || 'E-mail não informado'}</small>
                  </td>
                  <td style={td}>{member.email}</td>
                  <td style={td}>{formatPhone(member.phone)}</td>
                  <td style={td}>{member.hasLinkedAccount
                    ? <Badge color="#67bed9" background="#0d1e28"><Link2 size={11} /> Vinculada</Badge>
                    : <Badge color="#777" background="#191919">Sem conta</Badge>}
                  </td>
                  <td style={td}><StatusBadge active={member.isActive} /></td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button onClick={() => openDetail(member.id)} disabled={detailLoading} style={secondaryButton}>Detalhes</button>
                      <button onClick={() => toggleStatus(member)} disabled={acting === member.id} style={member.isActive ? dangerButton : primarySmallButton}>
                        {acting === member.id ? 'Aguarde...' : member.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20 }}>
        <button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} style={paginationButton}><ChevronLeft size={16} /></button>
        <span style={{ color: '#666', fontSize: 13 }}>Página {meta.page} de {Math.max(meta.lastPage, 1)} · {meta.total} resultado(s)</span>
        <button disabled={page >= meta.lastPage || loading} onClick={() => setPage((value) => value + 1)} style={paginationButton}><ChevronRight size={16} /></button>
      </div>

      {createOpen && (
        <Modal title="Cadastrar membro" onClose={() => { if (!saving) setCreateOpen(false); }}>
          <form onSubmit={submitMember} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nome"><input value={form.name} maxLength={100} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome completo" style={inputStyle} /></Field>
            <Field label="E-mail *"><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email@exemplo.com" style={inputStyle} /></Field>
            <Field label="Telefone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: formatPhoneInput(event.target.value) })} placeholder="(00) 00000-0000" style={inputStyle} /></Field>
            <p style={{ color: '#555', fontSize: 12 }}>O membro será cadastrado inicialmente como ativo.</p>
            <button type="submit" disabled={saving} style={primaryButton}>{saving ? 'Cadastrando...' : 'Cadastrar membro'}</button>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title="Detalhes do membro" onClose={() => setDetail(null)} wide>
          <MemberDetail member={detail} acting={acting === detail.id} onToggle={() => toggleStatus(detail)} />
        </Modal>
      )}

      <style>{`@media (max-width: 650px) { .club-summary-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function MemberDetail({ member, acting, onToggle }: { member: ClubMember; acting: boolean; onToggle: () => void }) {
  const usages = member.usages ?? [];
  return <div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
      <Info label="Status" value={member.isActive ? 'Ativo' : 'Inativo'} />
      <Info label="Nome" value={member.name || 'Não informado'} />
      <Info label="Telefone" value={formatPhone(member.phone)} />
      <Info label="E-mail" value={member.email} />
      <Info label="Criado em" value={formatDate(member.createdAt)} />
      <Info label="Ativado em" value={formatDate(member.activatedAt)} />
      <Info label="Desativado em" value={formatDate(member.deactivatedAt)} />
    </div>

    <section style={detailSection}>
      <h3 style={sectionTitle}>Conta vinculada</h3>
      {member.linkedAccount ? <div style={{ color: '#bbb', fontSize: 14 }}>
        <p style={{ fontWeight: 700, color: '#fff' }}>{member.linkedAccount.name}</p>
        <p>{member.linkedAccount.email}</p>
        <p style={{ color: member.linkedAccount.isActive ? '#67bed9' : '#ff8b8b', marginTop: 5 }}>Conta {member.linkedAccount.isActive ? 'ativa' : 'inativa'}</p>
      </div> : <p style={{ color: '#666', fontSize: 14 }}>Nenhuma conta Pago utiliza este e-mail.</p>}
    </section>

    <section style={detailSection}>
      <h3 style={sectionTitle}>Histórico de utilização</h3>
      {usages.length === 0 ? <p style={{ color: '#666', fontSize: 14 }}>Nenhuma utilização registrada.</p> : usages.map((usage) => <UsageCard key={usage.id} usage={usage} />)}
    </section>

    <button onClick={onToggle} disabled={acting} style={member.isActive ? dangerButton : primaryButton}>
      {acting ? 'Aguarde...' : member.isActive ? 'Desativar membro' : 'Ativar membro'}
    </button>
  </div>;
}

function UsageCard({ usage }: { usage: BenefitUsage }) {
  return <div style={{ background: '#151515', border: '1px solid #252525', borderRadius: 12, padding: 14, marginTop: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><strong>{usage.event.title}</strong><Badge color="#67bed9" background="#0d1e28">{usage.status}</Badge></div>
    <p style={usageLine}>Lote: {usage.batch?.name || '—'}</p>
    <p style={usageLine}>Pedido reservado: {orderLabel(usage.reservedOrder)}</p>
    <p style={usageLine}>Pedido confirmado: {orderLabel(usage.confirmedOrder)}</p>
    <p style={usageLine}>Valores: {money(usage.originalAmount)} − {money(usage.discountAmount)} = {money(usage.finalAmount)}</p>
    <p style={usageLine}>Reserva: {formatDate(usage.reservedAt)} · expira {formatDate(usage.reservationExpiresAt)}</p>
    <p style={usageLine}>Confirmação: {formatDate(usage.confirmedAt)} · liberação {formatDate(usage.releasedAt)}</p>
    {usage.releaseReason && <p style={{ ...usageLine, color: '#ff9d7a' }}>Motivo: {usage.releaseReason}</p>}
  </div>;
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return <div style={{ background: '#111', border: '1px solid #222', borderRadius: 15, padding: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, marginBottom: 10 }}>{icon}<span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{label}</span></div>
    <strong style={{ fontSize: 27 }}>{value}</strong>
  </div>;
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000c', display: 'grid', placeItems: 'center', padding: 18 }}>
    <div onMouseDown={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: wide ? 760 : 480, maxHeight: '88vh', overflowY: 'auto', background: '#111', border: '1px solid #292929', borderRadius: 18, padding: 24, boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}><h2 style={{ fontSize: 20 }}>{title}</h2><button onClick={onClose} style={iconButton}><X size={17} /></button></div>
      {children}
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ display: 'flex', flexDirection: 'column', gap: 7, color: '#888', fontSize: 13 }}>{label}{children}</label>; }
function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div style={{ background: '#151515', border: '1px solid #222', borderRadius: 11, padding: 12 }}><small style={{ display: 'block', color: '#555', marginBottom: 5 }}>{label}</small><span style={{ color: '#ccc', fontSize: 14, fontFamily: mono ? 'monospace' : undefined }}>{value}</span></div>; }
function Badge({ children, color, background }: { children: React.ReactNode; color: string; background: string }) { return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color, background, padding: '4px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{children}</span>; }
function StatusBadge({ active }: { active: boolean }) { return active ? <Badge color="#67bed9" background="#0d1e28">Ativo</Badge> : <Badge color="#888" background="#1b1b1b">Inativo</Badge>; }

function formatPhoneInput(value: string) { const d = value.replace(/\D/g, '').slice(0, 11); if (d.length <= 2) return d; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; }
function formatPhone(value?: string | null) { return value ? formatPhoneInput(value) : 'Não informado'; }
function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('pt-BR') : '—'; }
function money(value?: string | number | null) { return value == null ? '—' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function orderLabel(order?: { id: string; status: string } | null) { return order ? `${order.id.slice(-8).toUpperCase()} (${order.status})` : '—'; }
function apiMessage(error: any, fallback: string) { const message = error.response?.data?.message; return Array.isArray(message) ? message.join(', ') : message || fallback; }

const inputStyle: React.CSSProperties = { background: '#171717', border: '1px solid #292929', color: '#fff', borderRadius: 10, padding: '11px 13px', outline: 'none', fontSize: 14 };
const primaryButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#67bed9', color: '#fff', border: 0, borderRadius: 10, padding: '11px 16px', fontWeight: 700, cursor: 'pointer' };
const primarySmallButton: React.CSSProperties = { ...primaryButton, padding: '7px 11px', fontSize: 12 };
const secondaryButton: React.CSSProperties = { background: '#191919', color: '#aaa', border: '1px solid #303030', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 12 };
const dangerButton: React.CSSProperties = { display: 'inline-flex', justifyContent: 'center', background: '#2a1717', color: '#ff8b8b', border: '1px solid #5a2929', borderRadius: 9, padding: '9px 13px', cursor: 'pointer', fontWeight: 700 };
const paginationButton: React.CSSProperties = { ...secondaryButton, display: 'flex', padding: 9 };
const memberButton: React.CSSProperties = { border: 0, background: 'none', color: '#fff', padding: 0, cursor: 'pointer', fontWeight: 700, textAlign: 'left' };
const iconButton: React.CSSProperties = { background: '#191919', border: '1px solid #292929', color: '#888', borderRadius: 8, padding: 7, display: 'flex', cursor: 'pointer' };
const th: React.CSSProperties = { textAlign: 'left', color: '#555', background: '#131313', padding: 13, fontSize: 12, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { color: '#bbb', padding: 13, fontSize: 13, verticalAlign: 'middle' };
const small: React.CSSProperties = { display: 'block', color: '#555', marginTop: 4 };
const detailSection: React.CSSProperties = { borderTop: '1px solid #242424', marginTop: 20, paddingTop: 18 };
const sectionTitle: React.CSSProperties = { fontSize: 15, marginBottom: 12 };
const usageLine: React.CSSProperties = { color: '#777', fontSize: 12, marginTop: 7 };
