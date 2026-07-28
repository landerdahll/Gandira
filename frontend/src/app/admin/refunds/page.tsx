'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { refundsApi } from '@/lib/api';

const labels: Record<string,string> = { REFUND_PENDING:'Pendente', REFUNDED:'Reembolsado', REFUND_FAILED:'Falhou' };
export default function AdminRefundsPage() {
  const [rows,setRows]=useState<any[]>([]),[meta,setMeta]=useState({total:0,page:1,lastPage:1}),[loading,setLoading]=useState(true);
  async function load(page=1){setLoading(true);try{const {data}=await refundsApi.adminList({page,limit:20});setRows(data.data);setMeta(data.meta)}catch{toast.error('Erro ao carregar cancelamentos')}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  return <main style={{maxWidth:1180,margin:'0 auto',padding:'32px 20px 80px',color:'#fff'}}><AdminNavigation/><h1 style={{marginTop:28}}>Histórico de cancelamentos</h1><p style={{color:'#666'}}>{meta.total} registro(s)</p>{loading?<p>Carregando…</p>:<div style={{overflowX:'auto',border:'1px solid #222',borderRadius:14}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr>{['Pedido','Cliente','Evento','Valor','Gateway','Status','Data'].map(h=><th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} style={{borderTop:'1px solid #222'}}><td style={td}>{r.orderId.slice(-8).toUpperCase()}</td><td style={td}>{r.order.user.name}<small>{r.order.user.email}</small></td><td style={td}>{r.order.event.title}</td><td style={td}>{Number(r.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td><td style={td}>{r.gateway}</td><td style={td} title={r.failureReason??''}>{labels[r.status]??r.status}</td><td style={td}>{new Date(r.requestedAt).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div>}<div style={{display:'flex',justifyContent:'center',gap:12,marginTop:20}}><button disabled={meta.page<=1} onClick={()=>load(meta.page-1)}>Anterior</button><span>{meta.page} / {meta.lastPage||1}</span><button disabled={meta.page>=meta.lastPage} onClick={()=>load(meta.page+1)}>Próxima</button></div></main>;
}
const th:React.CSSProperties={textAlign:'left',padding:13,color:'#666',background:'#121212'};const td:React.CSSProperties={padding:13,color:'#bbb',verticalAlign:'top'};
