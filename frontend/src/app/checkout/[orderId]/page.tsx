'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck, CalendarDays, MapPin, Ticket, Copy, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi, pixApi } from '@/lib/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function fmtDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PaymentForm({ orderId, total }: { orderId: string; total: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
    });
    if (error) {
      toast.error(error.message ?? 'Erro no pagamento');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs', fields: { billingDetails: { name: 'auto' } } }} />
      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          marginTop: '24px', width: '100%', padding: '15px',
          borderRadius: '14px', border: 'none',
          background: !stripe || loading ? '#1a2e35' : '#67bed9',
          color: !stripe || loading ? '#4a8a9a' : '#fff',
          fontSize: '16px', fontWeight: 700,
          cursor: !stripe || loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.2s',
          boxShadow: !stripe || loading ? 'none' : '0 0 28px #67bed940',
        }}
        onMouseEnter={e => { if (stripe && !loading) e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >
        <Lock size={16} />
        {loading ? 'Processando...' : `Pagar ${fmtCurrency(total)}`}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
        <ShieldCheck size={13} color="#3a6a5a" />
        <span style={{ fontSize: '12px', color: '#3a5a50' }}>Pagamento processado com segurança pelo Stripe</span>
      </div>
    </form>
  );
}

function PixTab({ orderId, total }: { orderId: string; total: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ id: string; qrCode: string; qrImage: string; expiresAt: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!pixData) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor(pixData.expiresAt - Date.now() / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [pixData]);

  useEffect(() => {
    if (!pixData) return;
    let tick = 0;
    const interval = setInterval(async () => {
      tick++;
      try {
        // A cada 2 ticks (~5s) consulta o AbacatePay diretamente como fallback
        if (tick % 2 === 0) {
          const res = await pixApi.check(pixData.id, orderId);
          if (res.data.status === 'PAID') {
            clearInterval(interval);
            router.push(`/checkout/success?orderId=${orderId}`);
            return;
          }
        }
        const res = await ordersApi.get(orderId);
        if (res.data.status === 'PAID') {
          clearInterval(interval);
          router.push(`/checkout/success?orderId=${orderId}`);
        }
      } catch {}
    }, 2500);
    return () => clearInterval(interval);
  }, [pixData, orderId, router]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await pixApi.create(orderId);
      const d = res.data;
      setPixData({
        id: d.id,
        qrCode: d.brCode,
        qrImage: d.brCodeBase64,
        expiresAt: new Date(d.expiresAt).getTime() / 1000,
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao gerar PIX');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!pixData) {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: '#0d1e28', border: '1px solid #67bed922',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '28px',
        }}>
          🏦
        </div>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Pague com PIX</p>
        <p style={{ fontSize: '13px', color: '#555', marginBottom: '28px', lineHeight: 1.5 }}>
          QR Code gerado na hora. Pague pelo app do seu banco em segundos.
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
            background: loading ? '#1a2e35' : '#67bed9',
            color: loading ? '#4a8a9a' : '#fff',
            fontSize: '16px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: loading ? 'none' : '0 0 28px #67bed940',
          }}
        >
          {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</> : `Gerar PIX — ${fmtCurrency(total)}`}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const expired = secondsLeft <= 0;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>PIX gerado!</p>
        <p style={{ fontSize: '13px', color: '#555' }}>Escaneie o QR Code ou use o Copia e Cola no app do banco</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{ padding: '14px', background: '#fff', borderRadius: '16px' }}>
          <img src={pixData.qrImage} alt="QR Code PIX" style={{ width: '190px', height: '190px', display: 'block' }} />
        </div>
      </div>

      <button
        onClick={handleCopy}
        disabled={expired}
        style={{
          width: '100%', padding: '12px', marginBottom: '16px',
          borderRadius: '12px', border: `1px solid ${copied ? '#67bed944' : '#252525'}`,
          background: copied ? '#0d1e28' : '#1a1a1a',
          color: copied ? '#67bed9' : '#888',
          fontSize: '13px', fontWeight: 600, cursor: expired ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.2s',
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? 'Código copiado!' : 'Copiar código Copia e Cola'}
      </button>

      <div style={{ textAlign: 'center' }}>
        {expired ? (
          <p style={{ fontSize: '13px', color: '#ff6b6b' }}>PIX expirado. Volte e tente novamente.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <Loader2 size={14} color="#67bed9" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '13px', color: '#555' }}>Aguardando confirmação do pagamento...</span>
            </div>
            <p style={{ fontSize: '12px', color: '#333', marginBottom: '16px' }}>
              Expira em {mins}:{secs.toString().padStart(2, '0')}
            </p>
            <button
              onClick={async () => {
                setSimulating(true);
                try {
                  await pixApi.simulate(pixData!.id);
                  toast.success('Pagamento simulado! Aguarde a confirmação...');
                } catch {
                  toast.error('Erro ao simular. Verifique se está em modo dev.');
                } finally {
                  setSimulating(false);
                }
              }}
              disabled={simulating}
              style={{
                padding: '8px 18px', borderRadius: '8px',
                border: '1px solid #333', background: '#1a1a1a',
                color: '#555', fontSize: '12px', fontWeight: 600,
                cursor: simulating ? 'not-allowed' : 'pointer',
              }}
            >
              {simulating ? 'Simulando...' : '🧪 Simular pagamento (sandbox)'}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const clientSecret = searchParams.get('secret');
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [paymentTab, setPaymentTab] = useState<'card' | 'pix'>('pix');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    const id = window.location.pathname.split('/').pop() ?? '';
    setOrderId(id);
    if (id) ordersApi.get(id).then(r => setOrder(r.data)).catch(() => router.push('/'));
  }, []);

  if (!clientSecret) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
        <p style={{ color: '#555' }}>Link inválido</p>
      </div>
    );
  }

  const total = order ? Number(order.total) : 0;
  const subtotal = order ? Number(order.subtotal) : 0;
  const fee = order ? Number(order.platformFee) : 0;
  const discount = order ? Number(order.discountAmount ?? 0) : 0;
  const items: any[] = order?.items ?? [];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      padding: '32px 16px 80px',
      boxSizing: 'border-box',
    }}>
      <div className="checkout-layout" style={{ width: '100%', maxWidth: '860px', margin: '0 auto', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

        {/* Left — Order summary */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Logo */}
          <div style={{ marginBottom: '8px' }}>
            <img src="/gandira-logo.png" alt="Gandira" style={{ height: '32px', objectFit: 'contain' }} />
          </div>

          {/* Event card */}
          <div style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '18px',
            overflow: 'hidden',
          }}>
            {order?.event?.coverImage && (
              <div style={{
                height: '140px',
                background: `linear-gradient(180deg, transparent 40%, #111 100%), url(${order.event.coverImage}) center/cover no-repeat`,
              }} />
            )}
            <div style={{ padding: '20px' }}>
              <p style={{ fontSize: '11px', color: '#67bed9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Resumo do pedido
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '14px', lineHeight: 1.3 }}>
                {order?.event?.title ?? '...'}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {order?.event?.startDate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarDays size={13} color="#555" />
                    <span style={{ fontSize: '13px', color: '#666' }}>{fmtDate(order.event.startDate)}</span>
                  </div>
                )}
                {order?.event?.venue && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={13} color="#555" />
                    <span style={{ fontSize: '13px', color: '#666' }}>{order.event.venue}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Ticket size={13} color="#67bed9" />
                      <span style={{ fontSize: '13px', color: '#bbb' }}>
                        {item.batch?.name} × {item.quantity}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                      {fmtCurrency(Number(item.total))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ borderTop: '1px solid #1e1e1e', marginTop: '14px', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#555' }}>Subtotal</span>
                  <span style={{ fontSize: '13px', color: '#888' }}>{fmtCurrency(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#555' }}>Taxa de serviço</span>
                  <span style={{ fontSize: '13px', color: '#888' }}>{fmtCurrency(fee)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#67bed9' }}>Desconto (cupom)</span>
                    <span style={{ fontSize: '13px', color: '#67bed9', fontWeight: 600 }}>−{fmtCurrency(discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid #252525' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Total</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#67bed9' }}>{fmtCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Payment form */}
        <div style={{ flex: '1 1 340px' }}>
          <div style={{
            background: '#111', border: '1px solid #1e1e1e',
            borderRadius: '18px', padding: '28px',
            position: 'sticky', top: '40px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: '#0d1e28', border: '1px solid #67bed922',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={16} color="#67bed9" />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Pagamento seguro</p>
                <p style={{ fontSize: '12px', color: '#555' }}>Seus dados são criptografados</p>
              </div>
            </div>

            {/* Payment method tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {/* PIX — destaque */}
              <button
                onClick={() => setPaymentTab('pix')}
                style={{
                  flex: 3, padding: '12px 0', borderRadius: '12px', cursor: 'pointer',
                  border: `1.5px solid ${paymentTab === 'pix' ? '#32bcad' : '#1e1e1e'}`,
                  background: paymentTab === 'pix' ? 'linear-gradient(135deg, #0a2e2a 0%, #0d3330 100%)' : '#141414',
                  transition: 'all 0.15s',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: '18px', display: 'block', marginBottom: '2px' }}>🏦</span>
                <span style={{
                  fontSize: '13px', fontWeight: 800,
                  color: paymentTab === 'pix' ? '#32bcad' : '#444',
                  display: 'block',
                }}>PIX</span>
                <span style={{ fontSize: '11px', color: paymentTab === 'pix' ? '#1a7a6e' : '#333', display: 'block' }}>
                  Aprovação imediata
                </span>
              </button>

              {/* Cartão */}
              <button
                onClick={() => setPaymentTab('card')}
                style={{
                  flex: 2, padding: '12px 0', borderRadius: '12px', cursor: 'pointer',
                  border: `1.5px solid ${paymentTab === 'card' ? '#67bed955' : '#1e1e1e'}`,
                  background: paymentTab === 'card' ? '#0d1e28' : '#141414',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '18px', display: 'block', marginBottom: '2px' }}>💳</span>
                <span style={{
                  fontSize: '13px', fontWeight: 700,
                  color: paymentTab === 'card' ? '#67bed9' : '#444',
                  display: 'block',
                }}>Cartão</span>
                <span style={{ fontSize: '11px', color: paymentTab === 'card' ? '#3a7a8a' : '#333', display: 'block' }}>
                  Crédito / Débito
                </span>
              </button>
            </div>

            {paymentTab === 'card' && clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#67bed9',
                      colorBackground: '#1a1a1a',
                      colorText: '#ffffff',
                      colorTextSecondary: '#888888',
                      colorDanger: '#ff6b6b',
                      borderRadius: '12px',
                      fontFamily: 'system-ui, sans-serif',
                      spacingUnit: '5px',
                    },
                    rules: {
                      '.Input': { border: '1px solid #252525', boxShadow: 'none' },
                      '.Input:focus': { border: '1px solid #67bed9', boxShadow: '0 0 0 2px #67bed915' },
                      '.Label': { color: '#888', fontSize: '13px', fontWeight: '500' },
                      '.Tab': { border: '1px solid #252525', background: '#141414' },
                      '.Tab--selected': { border: '1px solid #67bed955', background: '#0d1e28' },
                    },
                  },
                }}
              >
                <PaymentForm orderId={orderId} total={total} />
              </Elements>
            )}

            {paymentTab === 'pix' && orderId && (
              <PixTab orderId={orderId} total={total} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
