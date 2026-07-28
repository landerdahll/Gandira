'use client';
import { useState } from 'react';
import { CancellationPolicyModal, modal, overlay } from './cancellation-policy-modal';

export function CancelTicketModal({ busy, onBack, onConfirm }: { busy: boolean; onBack: () => void; onConfirm: () => void }) {
  const [accepted, setAccepted] = useState(false), [policy, setPolicy] = useState(false);
  return <><div role="dialog" aria-modal="true" aria-labelledby="cancel-title" style={overlay}><div style={modal}>
    <h2 id="cancel-title" style={{ marginTop:0, color:'#fff' }}>Cancelar ingresso</h2>
    <p>Você está prestes a cancelar esta compra.</p><p><strong>O cancelamento é definitivo.</strong></p>
    <p>Todos os ingressos vinculados ao pedido serão invalidados imediatamente e seus QR Codes deixarão de permitir acesso ao evento.</p>
    <p>O reembolso será solicitado automaticamente para o mesmo meio de pagamento utilizado na compra.</p>
    <p>Nos pagamentos via cartão de crédito, o prazo depende da operadora do cartão e da instituição financeira.</p>
    <p>Nos pagamentos via Pix, o prazo depende da instituição financeira e do provedor de pagamento.</p>
    <p>Deseja realmente cancelar esta compra?</p>
    <label style={{ display:'flex', gap:10, alignItems:'flex-start', margin:'20px 0', cursor:'pointer' }}><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} style={{ marginTop:5 }}/><span>Li e concordo com a <button type="button" onClick={e=>{e.preventDefault();setPolicy(true)}} style={{ border:0, padding:0, background:'none', color:'#67bed9', textDecoration:'underline', cursor:'pointer' }}>Política de Cancelamento e Reembolso</button>.</span></label>
    <div style={{ display:'flex', gap:10 }}><button disabled={busy} onClick={onBack} style={{ flex:1,padding:13,borderRadius:10,border:'1px solid #333',background:'transparent',color:'#aaa' }}>Voltar</button><button disabled={!accepted||busy} onClick={onConfirm} style={{ flex:1,padding:13,borderRadius:10,border:0,background:accepted?'#dc2626':'#3a1a1a',color:'#fff',fontWeight:700,cursor:accepted?'pointer':'not-allowed' }}>{busy?'Processando…':'Cancelar ingresso'}</button></div>
  </div></div>{policy && <CancellationPolicyModal onClose={()=>setPolicy(false)}/>}</>;
}
