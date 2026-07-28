'use client';
import { X } from 'lucide-react';

export function CancellationPolicyModal({ onClose }: { onClose: () => void }) {
  return <div role="dialog" aria-modal="true" aria-labelledby="policy-title" style={overlay} onClick={onClose}>
    <div style={modal} onClick={e => e.stopPropagation()}>
      <button aria-label="Fechar" onClick={onClose} style={close}><X size={18}/></button>
      <h2 id="policy-title" style={{ marginTop: 0 }}>Política de Cancelamento e Reembolso</h2>
      <p>O comprador poderá solicitar o cancelamento da compra em até 7 dias corridos contados da data da aquisição, desde que a solicitação seja realizada com antecedência mínima de 48 horas em relação ao início do evento.</p>
      <p>Após esse prazo, o cancelamento automático não estará mais disponível.</p>
      <p>Ao confirmar o cancelamento:</p>
      <ul><li>todos os ingressos do pedido serão invalidados;</li><li>todos os QR Codes deixarão de ser válidos;</li><li>o reembolso será solicitado automaticamente utilizando o mesmo meio de pagamento da compra.</li></ul>
      <p>O processamento do reembolso dependerá exclusivamente da instituição financeira, operadora do cartão ou provedor de pagamento utilizado.</p>
      <p>Após a confirmação do cancelamento não será possível reativar o ingresso.</p>
      <button onClick={onClose} style={primary}>Entendi</button>
    </div>
  </div>;
}
export const overlay: React.CSSProperties = { position:'fixed', inset:0, zIndex:100, background:'#000c', display:'grid', placeItems:'center', padding:16 };
export const modal: React.CSSProperties = { width:'100%', maxWidth:560, maxHeight:'88vh', overflow:'auto', background:'#111', color:'#ddd', border:'1px solid #333', borderRadius:18, padding:24, lineHeight:1.6, position:'relative' };
export const close: React.CSSProperties = { position:'absolute', right:16, top:16, background:'transparent', color:'#888', border:0, cursor:'pointer' };
export const primary: React.CSSProperties = { width:'100%', padding:13, border:0, borderRadius:10, background:'#67bed9', color:'#fff', fontWeight:700, cursor:'pointer' };
