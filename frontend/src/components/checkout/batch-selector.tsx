'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Lock, CheckCircle2, Tag, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { ordersApi, couponsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Batch {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  sold: number;
  status: string;
  ticketType: string;
  sortOrder?: number;
}

interface CouponData {
  id: string;
  code: string;
  discount: number;
}

export function BatchSelector({ eventId, batches }: { eventId: string; batches: Batch[] }) {
  const router = useRouter();
  const { user } = useAuth();
  const [qty, setQty] = useState(0);
  const [loading, setLoading] = useState(false);

  const [couponInput, setCouponInput] = useState('');
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [clubCouponBlocked, setClubCouponBlocked] = useState(false);

  const sorted = [...batches].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const activeBatches = sorted.filter((b) => b.status === 'ACTIVE');
  const currentBatch = activeBatches.find((b) => b.quantity - b.sold > 0) ?? null;
  const maxQty = currentBatch ? Math.min(10, currentBatch.quantity - currentBatch.sold) : 0;

  const subtotal = currentBatch ? qty * Number(currentBatch.price) : 0;
  const discount = couponData ? subtotal * (couponData.discount / 100) : 0;
  const totalPrice = subtotal - discount;

  function changeQty(delta: number) {
    setQty(prev => Math.max(0, Math.min(maxQty, prev + delta)));
  }

  async function handleValidateCoupon() {
    if (clubCouponBlocked) return;
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await couponsApi.validate(eventId, couponInput.trim());
      setCouponData(res.data);
      toast.success(`Cupom aplicado! −${res.data.discount}% de desconto`);
    } catch (err: any) {
      setCouponError(err.response?.data?.message ?? 'Cupom inválido');
      setCouponData(null);
    } finally {
      setValidatingCoupon(false);
    }
  }

  function removeCoupon() {
    setCouponData(null);
    setCouponInput('');
    setCouponError('');
  }

  async function handleCheckout() {
    if (!user) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!user.isVerified) {
      toast.error('Verifique seu e-mail antes de comprar ingressos');
      router.push('/auth/verify-email');
      return;
    }
    if (!currentBatch || qty === 0) {
      toast.error('Selecione pelo menos 1 ingresso');
      return;
    }
    setLoading(true);
    try {
      const res = await ordersApi.create({
        eventId,
        items: [{ batchId: currentBatch.id, quantity: qty }],
        ...(couponData ? { couponCode: couponData.code } : {}),
      });
      router.push(`/checkout/${res.data.orderId}?secret=${res.data.clientSecret}`);
    } catch (err: any) {
      const error = err.response?.data;
      if (error?.code === 'CLUB_BENEFIT_COUPON_NOT_ALLOWED') {
        setCouponData(null);
        setCouponInput('');
        setClubCouponBlocked(true);
        setCouponError('O Clube Outrahora está disponível para este evento e não acumula com cupom. Clique novamente para continuar com o benefício automático.');
        toast.success('Benefício do Clube Outrahora identificado');
      } else {
        toast.error(error?.message ?? 'Erro ao criar pedido');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {sorted.map((batch, index) => {
        const isCurrent = batch.id === currentBatch?.id;
        const isSoldOut = batch.status === 'SOLD_OUT' || (batch.status === 'ACTIVE' && batch.quantity - batch.sold <= 0);
        const lockedByPrevious = activeBatches.findIndex(b => b.id === currentBatch?.id) < index && currentBatch !== null;
        const locked = batch.status !== 'ACTIVE' && batch.status !== 'SOLD_OUT' || lockedByPrevious;

        return (
          <div className={`ticket-batch-card ${isCurrent ? 'ticket-batch-card--current' : ''} ${locked ? 'ticket-batch-card--future' : ''} ${isSoldOut ? 'ticket-batch-card--sold-out' : ''}`} key={batch.id} style={{
            borderRadius: '14px',
            border: `1px solid ${isCurrent ? '#67bed933' : '#1e1e1e'}`,
            background: isCurrent ? '#081419' : '#0f0f0f',
            overflow: 'hidden',
            opacity: locked || isSoldOut ? 0.55 : 1,
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: '6px' }}>
                  {isSoldOut ? (
                    <Badge className="ticket-batch-badge ticket-batch-badge--sold-out" color="#555" bg="#1a1a1a">Esgotado</Badge>
                  ) : locked ? (
                    <Badge className="ticket-batch-badge ticket-batch-badge--future" color="#555" bg="#1a1a1a" icon={<Lock size={9} />}>Em breve</Badge>
                  ) : isCurrent ? (
                    <Badge className="ticket-batch-badge ticket-batch-badge--available" color="#67bed9" bg="#0d1e28" icon={<CheckCircle2 size={9} />}>Disponível</Badge>
                  ) : null}
                </div>
                <p className="ticket-batch-title" style={{ fontSize: '15px', fontWeight: 700, color: locked || isSoldOut ? '#555' : '#fff', marginBottom: '2px' }}>
                  {batch.name}
                </p>
                {batch.description && <p className="ticket-batch-description" style={{ fontSize: '12px', color: '#555' }}>{batch.description}</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                <p className="ticket-batch-price" style={{ fontSize: '17px', fontWeight: 800, color: locked || isSoldOut ? '#444' : '#fff' }}>
                  {Number(batch.price) === 0 ? 'Grátis' : formatCurrency(Number(batch.price))}
                </p>
                {Number(batch.price) > 0 && !isSoldOut && (
                  <p className="ticket-batch-fees" style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>+ taxas</p>
                )}
              </div>
            </div>

            {isCurrent && (
              <div className="ticket-batch-quantity" style={{
                padding: '10px 16px 14px', borderTop: '1px solid #1e1e1e',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span className="ticket-batch-quantity-label" style={{ fontSize: '13px', color: '#666' }}>Quantidade</span>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button className="ticket-batch-quantity-button" onClick={() => changeQty(-1)} disabled={qty === 0} style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: '1px solid #252525', background: '#1a1a1a',
                    color: qty === 0 ? '#333' : '#aaa',
                    cursor: qty === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Minus size={14} /></button>
                  <span className="ticket-batch-quantity-count" style={{ width: '40px', textAlign: 'center', fontSize: '16px', fontWeight: 700, color: '#fff' }}>{qty}</span>
                  <button className="ticket-batch-quantity-button" onClick={() => changeQty(1)} disabled={qty >= maxQty} style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: '1px solid #252525', background: '#1a1a1a',
                    color: qty >= maxQty ? '#333' : '#aaa',
                    cursor: qty >= maxQty ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Plus size={14} /></button>
                </div>
              </div>
            )}

            {locked && (
              <div className="ticket-batch-future-note" style={{ padding: '8px 16px 12px', borderTop: '1px solid #161616', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={11} color="#444" />
                <span style={{ fontSize: '12px', color: '#444' }}>Disponível após o esgotamento do lote anterior</span>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Cupom de desconto ─────────────────────────────────────────── */}
      {currentBatch && qty > 0 && (
        <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: '14px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Tag size={13} color="#67bed9" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Cupom de desconto
            </span>
          </div>

          {user?.clubMembership?.isActive && (
            <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: '#0d1e28', border: '1px solid #67bed933' }}>
              <p style={{ margin: 0, color: '#67bed9', fontSize: 12, fontWeight: 700 }}>Clube Outrahora</p>
              <p style={{ margin: '3px 0 0', color: '#78909a', fontSize: 11, lineHeight: 1.4 }}>
                O benefício será verificado e aplicado automaticamente ao criar o pedido. Não é cumulativo com cupom.
              </p>
            </div>
          )}

          {couponData ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#0d1e28', border: '1px solid #67bed933',
              borderRadius: '10px', padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} color="#67bed9" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#67bed9' }}>{couponData.code}</span>
                <span style={{ fontSize: '12px', color: '#555' }}>−{couponData.discount}%</span>
              </div>
              <button onClick={removeCoupon} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#444', display: 'flex', padding: '2px',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#888')}
                onMouseLeave={e => (e.currentTarget.style.color = '#444')}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={couponInput}
                onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleValidateCoupon(); }}
                placeholder="Digite o código"
                disabled={clubCouponBlocked}
                style={{
                  flex: 1, background: '#171717', border: `1px solid ${couponError ? '#ff6b6b55' : '#252525'}`,
                  borderRadius: '10px', padding: '10px 12px',
                  color: '#fff', fontSize: '13px', outline: 'none',
                  fontFamily: 'monospace', letterSpacing: '1px', opacity: clubCouponBlocked ? 0.5 : 1,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#67bed9')}
                onBlur={e => (e.currentTarget.style.borderColor = couponError ? '#ff6b6b55' : '#252525')}
              />
              <button
                onClick={handleValidateCoupon}
                disabled={clubCouponBlocked || validatingCoupon || !couponInput.trim()}
                style={{
                  padding: '10px 16px', borderRadius: '10px', border: '1px solid #67bed955',
                  background: 'transparent', color: '#67bed9',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  opacity: clubCouponBlocked || validatingCoupon || !couponInput.trim() ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {validatingCoupon ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Aplicar'}
              </button>
            </div>
          )}

          {couponError && (
            <p style={{ fontSize: '12px', color: '#ff6b6b', marginTop: '6px' }}>{couponError}</p>
          )}
        </div>
      )}

      {/* ── Total + comprar ───────────────────────────────────────────── */}
      <div style={{ marginTop: '4px' }}>
        {qty > 0 && currentBatch && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 4px', marginBottom: '8px', borderBottom: '1px solid #1e1e1e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#666' }}>{qty} ingresso{qty > 1 ? 's' : ''}</span>
              <span style={{ fontSize: '13px', color: '#888' }}>{formatCurrency(subtotal)}</span>
            </div>
            {couponData && discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#67bed9' }}>Desconto ({couponData.discount}%)</span>
                <span style={{ fontSize: '13px', color: '#67bed9', fontWeight: 600 }}>−{formatCurrency(discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: couponData ? '1px solid #1e1e1e' : 'none', paddingTop: couponData ? '6px' : 0 }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Total</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>{formatCurrency(totalPrice)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || qty === 0}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: qty === 0 ? '#1a1a1a' : '#67bed9',
            color: qty === 0 ? '#444' : '#fff',
            fontSize: '15px', fontWeight: 700,
            cursor: qty === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
          }}
        >
          {loading ? 'Aguarde...' : qty === 0 ? 'Selecione um ingresso' : 'Comprar agora'}
        </button>
      </div>
    </div>
  );
}

function Badge({ children, color, bg, icon, className }: { children: React.ReactNode; color: string; bg: string; icon?: React.ReactNode; className?: string }) {
  return (
    <span className={className} style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px',
      background: bg, color, fontSize: '11px', fontWeight: 600,
    }}>
      {icon}{children}
    </span>
  );
}
