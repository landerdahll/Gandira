'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, History, Search, X } from 'lucide-react';
import { ticketTransfersApi } from '@/lib/api';
import { AdminNavigation } from '@/components/admin/admin-navigation';

const LABELS: Record<string, string> = { PENDING_REGISTRATION: 'Aguardando cadastro', COMPLETED: 'Concluída', CANCELLED: 'Cancelada', EXPIRED: 'Expirada' };
const ACTIONS: Record<string, string> = { TRANSFER_REQUESTED: 'Transferência solicitada', TRANSFER_INVITATION_SENT: 'Convite enviado', REGISTRATION_COMPLETED: 'Cadastro concluído', QR_INVALIDATED: 'QR anterior invalidado', QR_REGENERATED: 'Novo QR gerado', TRANSFER_COMPLETED: 'Transferência concluída', TRANSFER_CANCELLED: 'Transferência cancelada' };

export default function AdminTransfersPage() {
  const [data, setData] = useState<any[]>([]), [meta, setMeta] = useState({ total: 0, page: 1, lastPage: 1 });
  const [filters, setFilters] = useState<any>({ status: '', email: '', ticketCode: '', from: '', to: '' });
  const [loading, setLoading] = useState(true), [detail, setDetail] = useState<any>(null);
  async function load(page = 1) { setLoading(true); try { const r = await ticketTransfersApi.adminList({ ...filters, page, limit: 20 }); setData(r.data.data); setMeta(r.data.meta); } catch { toast.error('Erro ao carregar transferências'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function open(id: string) { try { setDetail((await ticketTransfersApi.adminDetail(id)).data); } catch { toast.error('Erro ao carregar detalhes'); } }
  return <div className="master-transfers-panel" style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 80px', color: '#fff' }}>
    <AdminNavigation />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}><History color="#67bed9" /><h1 style={{ fontSize: 24 }}>Histórico de transferências</h1></div>
    <p style={{ color: '#666', fontSize: 14 }}>{meta.total} registro(s) encontrado(s)</p>
    <div className="master-transfer-filters" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 1fr 1fr 1fr auto', gap: 8, margin: '24px 0' }}>
      <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} style={input}><option value="">Todos os status</option>{Object.entries(LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input value={filters.email} onChange={e => setFilters({ ...filters, email: e.target.value })} placeholder="E-mail destinatário" style={input}/>
      <input value={filters.ticketCode} onChange={e => setFilters({ ...filters, ticketCode: e.target.value })} placeholder="Código" style={input}/>
      <input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} style={input}/><input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} style={input}/>
      <button className="master-transfer-search" onClick={() => load(1)} style={button}><Search size={15}/></button>
    </div>
    {loading ? <p style={{ color: '#555' }}>Carregando...</p> : <div className="master-transfer-table" style={{ overflowX: 'auto', border: '1px solid #222', borderRadius: 14 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{['Evento / lote','Ingresso','Comprador original','Remetente','Destinatário','Solicitada em','Status','Titular atual'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{data.map(t => <tr className="master-transfer-row" key={t.id} onClick={() => open(t.id)} style={{ cursor: 'pointer', borderTop: '1px solid #1d1d1d' }}><td style={td}>{t.event.title}<small style={small}>{t.ticket.batch.name}</small></td><td style={td}>{t.ticket.id.slice(-8).toUpperCase()}</td><td style={td}>{t.ticket.order.user.name}</td><td style={td}>{t.sender.name}<small style={small}>{t.sender.email}</small></td><td style={td}>{t.recipient?.name ?? '—'}<small style={small}>{t.recipientEmail}</small></td><td style={td}>{new Date(t.requestedAt).toLocaleString('pt-BR')}</td><td style={td}>{LABELS[t.status]}</td><td style={td}>{t.ticket.owner.name}<small style={small}>{t.ticket.status}</small></td></tr>)}</tbody></table></div>}
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}><button className="master-transfer-pagination" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)} style={button}><ChevronLeft size={16}/></button><span style={{ color: '#666', padding: 10 }}>{meta.page} / {meta.lastPage || 1}</span><button className="master-transfer-pagination" disabled={meta.page >= meta.lastPage} onClick={() => load(meta.page + 1)} style={button}><ChevronRight size={16}/></button></div>
    {detail && <div style={{ position: 'fixed', inset: 0, background: '#000b', display: 'grid', placeItems: 'center', padding: 20, zIndex: 50 }} onClick={() => setDetail(null)}><div className="master-transfer-modal" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 620, maxHeight: '85vh', overflow: 'auto', background: '#111', border: '1px solid #292929', borderRadius: 18, padding: 24 }}><button className="master-transfer-pagination" onClick={() => setDetail(null)} style={{ ...button, float: 'right' }}><X size={15}/></button><h2>Linha do tempo</h2><p style={{ color: '#777' }}>{detail.event.title} · {detail.ticket.id.slice(-8).toUpperCase()}</p><Timeline label="Compra realizada" date={detail.ticket.createdAt}/>{detail.history.map((h:any) => <Timeline key={h.id} label={ACTIONS[h.action] ?? h.action} date={h.createdAt}/>)}{detail.ticket.checkIn && <Timeline label="Check-in realizado" date={detail.ticket.checkIn.checkedAt}/>}</div></div>}
  </div>;
}
function Timeline({ label, date }: { label: string; date: string }) { return <div style={{ borderLeft: '2px solid #67bed9', padding: '3px 0 20px 18px', marginLeft: 5 }}><strong style={{ fontSize: 14 }}>{label}</strong><small style={small}>{new Date(date).toLocaleString('pt-BR')}</small></div>; }
const input: React.CSSProperties = { background: '#151515', color: '#ddd', border: '1px solid #292929', borderRadius: 10, padding: '10px 12px', minWidth: 0, colorScheme: 'dark' };
const button: React.CSSProperties = { background: '#17252b', color: '#67bed9', border: '1px solid #29414b', borderRadius: 10, padding: '10px 14px', cursor: 'pointer' };
const th: React.CSSProperties = { textAlign: 'left', color: '#555', padding: 13, background: '#121212', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { color: '#bbb', padding: 13, verticalAlign: 'top' };
const small: React.CSSProperties = { display: 'block', color: '#555', marginTop: 3 };
