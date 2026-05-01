'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, MapPin, ArrowLeft, Share2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { ticketsApi } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; icon: React.ReactNode }> = {
  ACTIVE:    { label: 'Ativo',      bg: '#0a2018', color: '#4ade80', border: '#1a3828', icon: <CheckCircle2 size={13} /> },
  USED:      { label: 'Utilizado',  bg: '#1a1a1a', color: '#666',    border: '#252525', icon: <CheckCircle2 size={13} /> },
  CANCELLED: { label: 'Cancelado',  bg: '#2a0a0a', color: '#f87171', border: '#3a1a1a', icon: <XCircle size={13} /> },
};

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', params.id],
    queryFn: () => ticketsApi.get(params.id).then((r) => r.data),
  });

  if (isLoading) return <LoadingState />;
  if (!ticket) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#f87171', fontSize: 14 }}>Ingresso não encontrado.</p>
    </div>
  );

  const isActive = ticket.status === 'ACTIVE';
  const isUsed = ticket.status === 'USED';
  const status = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.ACTIVE;
  const price = Number(ticket.batch?.price ?? 0);

  const handleShare = () => {
    navigator.share?.({ title: ticket.event?.title, url: window.location.href });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '0 16px 60px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', paddingTop: 32 }}>

        {/* Back link */}
        <Link
          href="/my-tickets"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: '#555', textDecoration: 'none', marginBottom: 28,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#555')}
        >
          <ArrowLeft size={14} /> Meus ingressos
        </Link>

        {/* ── Ticket card ── */}
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #1e1e1e' }}>

          {/* Cover image / header */}
          <div style={{ position: 'relative', height: 180, background: '#111', overflow: 'hidden' }}>
            {ticket.event?.coverImage ? (
              <>
                <img
                  src={ticket.event.coverImage}
                  alt=""
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    opacity: isActive ? 0.5 : 0.2,
                    filter: isActive ? 'none' : 'grayscale(100%)',
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.4) 60%, transparent 100%)',
                }} />
              </>
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #0d1a1f 0%, #111 100%)',
              }} />
            )}

            {/* Status badge */}
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 700,
                background: status.bg, color: status.color,
                border: `1px solid ${status.border}`,
                borderRadius: 999, padding: '5px 12px',
                backdropFilter: 'blur(8px)',
              }}>
                {status.icon} {status.label}
              </span>
            </div>

            {/* Event title overlay */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 20px 20px' }}>
              <p style={{ fontSize: 11, color: '#67bed9', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {ticket.batch?.ticketType?.replace('_', ' ')}
              </p>
              <h1 style={{
                fontSize: 20, fontWeight: 900, color: '#fff',
                margin: 0, letterSpacing: '-0.4px', lineHeight: 1.2,
              }}>
                {ticket.event?.title}
              </h1>
            </div>
          </div>

          {/* Info section */}
          <div style={{ background: '#111', padding: '20px 20px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InfoRow icon={<Calendar size={14} color="#67bed9" />}>
                {format(new Date(ticket.event?.startDate), "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </InfoRow>
              <InfoRow icon={<MapPin size={14} color="#67bed9" />}>
                {ticket.event?.venue}
                {ticket.event?.address && (
                  <span style={{ color: '#444', marginLeft: 4 }}>· {ticket.event.address}</span>
                )}
              </InfoRow>
            </div>
          </div>

          {/* Perforation separator */}
          <div style={{ position: 'relative', margin: '20px 0', padding: '0 20px' }}>
            <div style={{ borderTop: '1px dashed #1e1e1e' }} />
            <div style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, borderRadius: '50%',
              background: '#0a0a0a', border: '1px solid #1a1a1a',
              marginLeft: -8,
            }} />
            <div style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, borderRadius: '50%',
              background: '#0a0a0a', border: '1px solid #1a1a1a',
              marginRight: -8,
            }} />
          </div>

          {/* QR code section */}
          <div style={{ background: '#111', padding: '4px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isActive && ticket.qrCodeUrl ? (
              <>
                <div style={{
                  background: '#fff', borderRadius: 16, padding: 14,
                  boxShadow: '0 0 40px rgba(103,190,217,0.15)',
                  marginBottom: 14,
                }}>
                  <img
                    src={ticket.qrCodeUrl}
                    alt="QR Code do ingresso"
                    style={{ width: 200, height: 200, display: 'block' }}
                  />
                </div>
                <p style={{ fontSize: 13, color: '#555', margin: 0, textAlign: 'center' }}>
                  Apresente este QR Code na entrada do evento
                </p>
              </>
            ) : isUsed ? (
              <div style={{
                textAlign: 'center', padding: '24px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: '#1a1a1a', border: '1px solid #252525',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={24} color="#555" />
                </div>
                <p style={{ fontSize: 14, color: '#555', margin: 0 }}>Ingresso já utilizado</p>
                {ticket.checkIn?.checkedAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#444' }}>
                    <Clock size={12} />
                    {format(new Date(ticket.checkIn.checkedAt), "d/MM/yyyy 'às' HH:mm")}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 14, color: '#555', margin: 0 }}>Ingresso cancelado</p>
              </div>
            )}
          </div>

          {/* Ticket metadata */}
          <div style={{
            background: '#0d0d0d', borderTop: '1px solid #161616',
            padding: '14px 20px',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
          }}>
            <MetaField label="Código" value={ticket.id.slice(-8).toUpperCase()} mono />
            <MetaField label="Lote" value={ticket.batch?.name ?? '—'} />
            <MetaField
              label="Valor"
              value={price === 0 ? 'Gratuito' : `R$ ${price.toFixed(2).replace('.', ',')}`}
            />
          </div>

          {/* Actions */}
          {isActive && (
            <div style={{
              background: '#0d0d0d', borderTop: '1px solid #161616',
              display: 'flex',
            }}>
              <button
                onClick={handleShare}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#555',
                  transition: 'color 0.15s, background 0.15s',
                  borderRadius: '0 0 0 20px',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#67bed9'; e.currentTarget.style.background = '#0c1a1f'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.background = 'none'; }}
              >
                <Share2 size={15} /> Compartilhar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function MetaField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: '#3a3a3a', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
        {label}
      </p>
      <p style={{
        fontSize: 13, color: '#666', margin: 0,
        fontFamily: mono ? 'monospace' : 'inherit',
        fontWeight: mono ? 600 : 500,
      }}>
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '32px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ height: 14, width: 100, background: '#141414', borderRadius: 8, marginBottom: 28 }} />
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #1a1a1a' }}>
          <div style={{ height: 180, background: '#111' }} />
          <div style={{ background: '#111', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 12, width: '60%', background: '#1a1a1a', borderRadius: 6 }} />
            <div style={{ height: 12, width: '40%', background: '#151515', borderRadius: 6 }} />
          </div>
          <div style={{ height: 280, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 228, height: 228, background: '#151515', borderRadius: 16 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
