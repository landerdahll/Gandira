'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck, CalendarDays, MapPin, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi } from '@/lib/api';

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
      <PaymentElement
        options={{
          layout: 'tabs',
          fields: { billingDetails: { name: 'auto' } },
        }}
      />

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          marginTop: '24px',
          width: '100%',
          padding: '15px',
          borderRadius: '14px',
          border: 'none',
          background: !stripe || loading ? '#1a2e35' : '#67bed9',
          color: !stripe || loading ? '#4a8a9a' : '#fff',
          fontSize: '16px',
          fontWeight: 700,
          cursor: !stripe || loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          boxShadow: !stripe || loading ? 'none' : '0 0 28px #67bed940',
        }}
        onMouseEnter={e => { if (stripe && !loading) e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
      >
        <Lock size={16} />
        {loading ? 'Processando...' : `Pagar ${fmtCurrency(total)}`}
      </button>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        marginTop: '14px',
      }}>
        <ShieldCheck size={13} color="#3a6a5a" />
        <span style={{ fontSize: '12px', color: '#3a5a50' }}>
          Pagamento processado com segurança pelo Stripe
        </span>
      </div>
    </form>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const clientSecret = searchParams.get('secret');
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
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
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '18px',
            padding: '28px',
            position: 'sticky',
            top: '40px',
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
              <PaymentForm orderId={window?.location?.pathname?.split('/')?.pop() ?? ''} total={total} />
            </Elements>
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
