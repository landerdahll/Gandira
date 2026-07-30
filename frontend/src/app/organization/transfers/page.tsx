'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, History, Search, X } from 'lucide-react';
import { organizationsApi } from '@/lib/api';
import { useOrganization } from '@/lib/organization-context';

const LABELS: Record<string,string> = { PENDING_REGISTRATION: 'Aguardando cadastro', PENDING_EMAIL_VERIFICATION: 'Aguardando verificação', COMPLETED: 'Concluída', CANCELLED: 'Cancelada', EXPIRED: 'Expirada' };
const ACTIONS: Record<string,string> = { TRANSFER_REQUESTED: 'Transferência solicitada', TRANSFER_INVITATION_SENT: 'Convite enviado', REGISTRATION_COMPLETED: 'Cadastro concluído', QR_INVALIDATED: 'QR anterior invalidado', QR_REGENERATED: 'Novo QR gerado', TRANSFER_COMPLETED: 'Transferência concluída', TRANSFER_CANCELLED: 'Transferência cancelada', TRANSFER_EXPIRED: 'Transferência expirada' };

export default function OrganizationTransfersPage() {
  const { active, canViewTransfers } = useOrganization();
  const organizationId = active?.organization.id;
  const [data,setData] = useState<any[]>([]), [meta,setMeta] = useState({ total: 0, page: 1, lastPage: 1 });
  const [filters,setFilters] = useState<any>({ status: '', email: '', ticketCode: '' });
  const [loading,setLoading] = useState(true), [detail,setDetail] = useState<any>(null);
  async function load(page=1) { if (!organizationId || !canViewTransfers) return; setLoading(true); try { const response = await organizationsApi.transfers(organizationId,{ ...filters, page, limit: 20 }); setData(response.data.data); setMeta(response.data.meta); } catch { toast.error('Não foi possível carregar as transferências'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [organizationId, canViewTransfers]);
  async function open(id:string) { try { setDetail((await organizationsApi.transfer(id)).data); } catch { toast.error('Não foi possível carregar os detalhes'); } }
  if (!canViewTransfers) return <p>Você não possui permissão para visualizar transferências administrativas.</p>;
  return <section><div style={{ display:'flex',alignItems:'center',gap:9 }}><History color="#67bed9"/><h1 style={{ fontSize:26 }}>Transferências da organização</h1></div><p style={{ color:'var(--theme-muted)' }}>{meta.total} registro(s). Cada transferência é vinculada à organização exclusivamente pelo evento do ingresso.</p>
    <div style={{ display:'flex',gap:8,margin:'22px 0',flexWrap:'wrap' }}><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})} style={input}><option value="">Todos os status</option>{Object.entries(LABELS).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select><input value={filters.email} onChange={e=>setFilters({...filters,email:e.target.value})} placeholder="E-mail destinatário" style={input}/><input value={filters.ticketCode} onChange={e=>setFilters({...filters,ticketCode:e.target.value})} placeholder="Código do ingresso" style={input}/><button onClick={()=>load(1)} style={button}><Search size={15}/>Buscar</button></div>
    {loading ? <p style={{ color:'var(--theme-muted)' }}>Carregando...</p> : <div style={{ overflowX:'auto',border:'1px solid var(--theme-border)',borderRadius:14 }}><table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}><thead><tr>{['Evento','Ingresso / lote','Remetente','Destinatário','Data','Status'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{data.map(transfer=><tr key={transfer.id} onClick={()=>open(transfer.id)} style={{ borderTop:'1px solid var(--theme-border)',cursor:'pointer' }}><td style={td}><strong>{transfer.event.title}</strong><small style={small}>Evento: {transfer.event.id}</small></td><td style={td}>{transfer.ticket.id.slice(-8).toUpperCase()}<small style={small}>{transfer.ticket.batch.name}</small></td><td style={td}>{transfer.sender.name}<small style={small}>{transfer.sender.email}</small></td><td style={td}>{transfer.recipient?.name || '—'}<small style={small}>{transfer.recipientEmail}</small></td><td style={td}>{new Date(transfer.requestedAt).toLocaleString('pt-BR')}</td><td style={td}>{LABELS[transfer.status] || transfer.status}</td></tr>)}</tbody></table></div>}
    <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:10,marginTop:18 }}><button disabled={meta.page<=1} onClick={()=>load(meta.page-1)} style={button}><ChevronLeft size={15}/></button><span>{meta.page} / {meta.lastPage || 1}</span><button disabled={meta.page>=meta.lastPage} onClick={()=>load(meta.page+1)} style={button}><ChevronRight size={15}/></button></div>
    {detail && <div onClick={()=>setDetail(null)} style={{ position:'fixed',inset:0,background:'#000b',display:'grid',placeItems:'center',padding:20,zIndex:60 }}><div onClick={event=>event.stopPropagation()} style={{ width:'100%',maxWidth:620,maxHeight:'85vh',overflow:'auto',padding:24,borderRadius:16,background:'var(--theme-surface)',border:'1px solid var(--theme-border)' }}><button onClick={()=>setDetail(null)} style={{...button,float:'right'}}><X size={15}/></button><h2>Linha do tempo</h2><p style={{ color:'var(--theme-muted)' }}><strong>Evento: {detail.event.title}</strong><br/>Ingresso {detail.ticket.id.slice(-8).toUpperCase()}</p>{detail.history.map((item:any)=><Timeline key={item.id} label={ACTIONS[item.action] || item.action} date={item.createdAt}/>)}</div></div>}
  </section>;
}
function Timeline({label,date}:{label:string;date:string}) { return <div style={{ borderLeft:'2px solid #67bed9',padding:'3px 0 18px 16px',marginLeft:5 }}><strong>{label}</strong><small style={small}>{new Date(date).toLocaleString('pt-BR')}</small></div>; }
const input:React.CSSProperties={ background:'var(--theme-surface)',color:'var(--theme-text)',border:'1px solid var(--theme-border)',borderRadius:9,padding:'9px 11px',colorScheme:'dark' };
const button:React.CSSProperties={ ...input,display:'flex',alignItems:'center',gap:6,cursor:'pointer',color:'#67bed9' };
const th:React.CSSProperties={ textAlign:'left',padding:12,color:'var(--theme-muted)',fontSize:12 };
const td:React.CSSProperties={ padding:12,verticalAlign:'top' };
const small:React.CSSProperties={ display:'block',color:'var(--theme-muted)',marginTop:3 };
