'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Ticket, Loader2, CalendarDays, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ordersApi, paymentsApi } from '@/lib/api';

function fmtDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [ready, setReady] = useState(false);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!orderId) return;
    let attempts = 0;
    let fallbackCalled = false;

    function celebrate() {
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.55 }, colors: ['#67bed9', '#ffffff', '#88aaff'] });
        setTimeout(() => confetti({ particleCount: 40, spread: 80, origin: { y: 0.5, x: 0.3 }, colors: ['#67bed9', '#fff'] }), 300);
        setTimeout(() => confetti({ particleCount: 40, spread: 80, origin: { y: 0.5, x: 0.7 }, colors: ['#67bed9', '#fff'] }), 500);
      }, 200);
    }

    const interval = setInterval(async () => {
      try {
        const res = await ordersApi.get(orderId);
        const data = res.data;
        if (data.status === 'PAID') {
          setOrder(data);
          setReady(true);
          clearInterval(interval);
          celebrate();
          return;
        }
      } catch {}

      attempts++;

      // After ~15s, call confirm-order as fallback (handles missing webhook)
      if (attempts === 10 && !fallbackCalled) {
        fallbackCalled = true;
        try {
          await paymentsApi.confirmOrder(orderId);
        } catch {}
      }

      if (attempts > 20) clearInterval(interval);
    }, 1500);

    return () => clearInterval(interval);
  }, [orderId]);

  const ticketCount = order?.tickets?.length ?? 0;
  const total = order ? Number(order.total) : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '40px' }}>
        <img src="/gandira-logo.png" alt="Gandira" style={{ height: '36px', objectFit: 'contain' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        {ready ? (
          <>
            {/* Success icon */}
            <div style={{
              width: '88px', height: '88px', borderRadius: '50%',
              background: '#0d1e28', border: '2px solid #67bed933',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 0 48px #67bed925',
            }}>
              <CheckCircle2 size={44} color="#67bed9" />
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Pagamento confirmado!
            </h1>
            <p style={{ fontSize: '15px', color: '#555', marginBottom: '32px' }}>
              {ticketCount} ingresso{ticketCount !== 1 ? 's' : ''} garantido{ticketCount !== 1 ? 's' : ''}. Boa festa!
            </p>

            {/* Order summary card */}
            {order && (
              <div style={{
                background: '#111',
                border: '1px solid #1e1e1e',
                borderRadius: '18px',
                overflow: 'hidden',
                marginBottom: '24px',
                textAlign: 'left',
              }}>
                {order.event?.coverImage && (
                  <div style={{
                    height: '100px',
                    background: `linear-gradient(180deg, transparent 20%, #111 100%), url(${order.event.coverImage}) center/cover no-repeat`,
                  }} />
                )}
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                    {order.event?.title}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {order.event?.startDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays size={12} color="#555" />
                        <span style={{ fontSize: '13px', color: '#666' }}>{fmtDate(order.event.startDate)}</span>
                      </div>
                    )}
                    {order.event?.venue && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={12} color="#555" />
                        <span style={{ fontSize: '13px', color: '#666' }}>{order.event.venue}</span>
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 14px',
                    background: '#0d1e28',
                    border: '1px solid #67bed922',
                    borderRadius: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Ticket size={14} color="#67bed9" />
                      <span style={{ fontSize: '13px', color: '#aaa' }}>
                        {ticketCount} ingresso{ticketCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#67bed9' }}>
                      {fmtCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CTA */}
            <Link
              href="/my-tickets"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', padding: '15px',
                borderRadius: '14px', border: 'none',
                background: '#67bed9', color: '#fff',
                fontSize: '15px', fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 0 28px #67bed940',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Ticket size={17} />
              Ver meus ingressos
            </Link>

            <Link
              href="/"
              style={{
                display: 'block', marginTop: '14px',
                fontSize: '13px', color: '#555', textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#888')}
              onMouseLeave={e => (e.currentTarget.style.color = '#555')}
            >
              Voltar ao início
            </Link>
          </>
        ) : (
          <>
            {/* Loading state */}
            <div style={{
              width: '88px', height: '88px', borderRadius: '50%',
              background: '#111', border: '1px solid #1e1e1e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Loader2 size={40} color="#67bed9" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
              Confirmando pagamento...
            </h1>
            <p style={{ fontSize: '14px', color: '#555' }}>
              Isso leva apenas alguns segundos.
            </p>

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '28px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#67bed9',
                  opacity: 0.3,
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>

            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
              @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
            `}</style>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
