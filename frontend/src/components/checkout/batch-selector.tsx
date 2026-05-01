'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Lock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { ordersApi } from '@/lib/api';
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

export function BatchSelector({ eventId, batches }: { eventId: string; batches: Batch[] }) {
  const router = useRouter();
  const { user } = useAuth();
  const [qty, setQty] = useState(0);
  const [loading, setLoading] = useState(false);

  // Sort by sortOrder, then filter only ACTIVE and SOLD_OUT to display
  const sorted = [...batches].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const activeBatches = sorted.filter((b) => b.status === 'ACTIVE');

  // The ONLY selectable batch is the first ACTIVE one with stock
  const currentBatch = activeBatches.find((b) => b.quantity - b.sold > 0) ?? null;
  const maxQty = currentBatch ? Math.min(10, currentBatch.quantity - currentBatch.sold) : 0;

  const totalPrice = currentBatch ? qty * Number(currentBatch.price) : 0;

  function changeQty(delta: number) {
    setQty(prev => Math.max(0, Math.min(maxQty, prev + delta)));
  }

  async function handleCheckout() {
    if (!user) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!currentBatch || qty === 0) {
      toast.error('Selecione pelo menos 1 ingresso');
      return;
    }
    setLoading(true);
    try {
      const res = await ordersApi.create({ eventId, items: [{ batchId: currentBatch.id, quantity: qty }] });
      router.push(`/checkout/${res.data.orderId}?secret=${res.data.clientSecret}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {sorted.map((batch, index) => {
        const isCurrent = batch.id === currentBatch?.id;
        const isSoldOut = batch.status === 'SOLD_OUT' || (batch.status === 'ACTIVE' && batch.quantity - batch.sold <= 0);
        const isLocked = !isCurrent && !isSoldOut && batch.status === 'ACTIVE';
        const isFuture = batch.status !== 'ACTIVE' && batch.status !== 'SOLD_OUT';

        // Determine which previous active batch hasn't sold out yet (to lock this one)
        const lockedByPrevious = activeBatches.findIndex(b => b.id === currentBatch?.id) < index &&
          currentBatch !== null;

        const locked = isFuture || lockedByPrevious;

        return (
          <div
            key={batch.id}
            style={{
              borderRadius: '14px',
              border: `1px solid ${isCurrent ? '#67bed933' : '#1e1e1e'}`,
              background: isCurrent ? '#081419' : '#0f0f0f',
              overflow: 'hidden',
              opacity: locked || isSoldOut ? 0.55 : 1,
              transition: 'all 0.2s',
            }}
          >
            {/* Batch header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Status badge */}
                <div style={{ marginBottom: '6px' }}>
                  {isSoldOut ? (
                    <Badge color="#555" bg="#1a1a1a">Esgotado</Badge>
                  ) : locked ? (
                    <Badge color="#555" bg="#1a1a1a" icon={<Lock size={9} />}>Em breve</Badge>
                  ) : isCurrent ? (
                    <Badge color="#67bed9" bg="#0d1e28" icon={<CheckCircle2 size={9} />}>Disponível</Badge>
                  ) : null}
                </div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: locked || isSoldOut ? '#555' : '#fff', marginBottom: '2px' }}>
                  {batch.name}
                </p>
                {batch.description && (
                  <p style={{ fontSize: '12px', color: '#555' }}>{batch.description}</p>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                <p style={{ fontSize: '17px', fontWeight: 800, color: locked || isSoldOut ? '#444' : '#fff' }}>
                  {Number(batch.price) === 0 ? 'Grátis' : formatCurrency(Number(batch.price))}
                </p>
                {isSoldOut && (
                  <p style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>Esgotado</p>
                )}
              </div>
            </div>

            {/* Quantity selector — only on current batch */}
            {isCurrent && (
              <div style={{
                padding: '10px 16px 14px',
                borderTop: '1px solid #1e1e1e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '13px', color: '#666' }}>Quantidade</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                  <button
                    onClick={() => changeQty(-1)}
                    disabled={qty === 0}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      border: '1px solid #252525', background: '#1a1a1a',
                      color: qty === 0 ? '#333' : '#aaa',
                      cursor: qty === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{
                    width: '40px', textAlign: 'center',
                    fontSize: '16px', fontWeight: 700, color: '#fff',
                  }}>
                    {qty}
                  </span>
                  <button
                    onClick={() => changeQty(1)}
                    disabled={qty >= maxQty}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      border: '1px solid #252525', background: '#1a1a1a',
                      color: qty >= maxQty ? '#333' : '#aaa',
                      cursor: qty >= maxQty ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Locked message */}
            {locked && (
              <div style={{
                padding: '8px 16px 12px',
                borderTop: '1px solid #161616',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Lock size={11} color="#444" />
                <span style={{ fontSize: '12px', color: '#444' }}>
                  Disponível após o esgotamento do lote anterior
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Total + buy */}
      <div style={{ marginTop: '4px' }}>
        {qty > 0 && currentBatch && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 4px', marginBottom: '8px',
            borderBottom: '1px solid #1e1e1e',
          }}>
            <span style={{ fontSize: '13px', color: '#666' }}>{qty} ingresso{qty > 1 ? 's' : ''}</span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{formatCurrency(totalPrice)}</span>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || qty === 0}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: qty === 0 ? '#1a1a1a' : '#67bed9',
            color: qty === 0 ? '#444' : '#fff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: qty === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Aguarde...' : qty === 0 ? 'Selecione um ingresso' : 'Comprar agora'}
        </button>
      </div>
    </div>
  );
}

function Badge({
  children,
  color,
  bg,
  icon,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
  icon?: React.ReactNode;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px',
      background: bg, color, fontSize: '11px', fontWeight: 600,
    }}>
      {icon}{children}
    </span>
  );
}
