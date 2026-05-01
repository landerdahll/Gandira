'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ticket, QrCode, Calendar, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ticketsApi } from '@/lib/api';

type Filter = 'ALL' | 'ACTIVE' | 'USED' | 'CANCELLED';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ACTIVE:    { label: 'Ativo',      bg: '#0a2018', color: '#4ade80', border: '#1a3828' },
  USED:      { label: 'Utilizado',  bg: '#1a1a1a', color: '#666',    border: '#252525' },
  CANCELLED: { label: 'Cancelado',  bg: '#2a0a0a', color: '#f87171', border: '#3a1a1a' },
};

export default function MyTicketsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => ticketsApi.list().then((r) => r.data),
  });

  const allTickets: any[] = data?.data ?? [];
  const tickets = filter === 'ALL' ? allTickets : allTickets.filter(t => t.status === filter);

  const counts = {
    ALL: allTickets.length,
    ACTIVE: allTickets.filter(t => t.status === 'ACTIVE').length,
    USED: allTickets.filter(t => t.status === 'USED').length,
    CANCELLED: allTickets.filter(t => t.status === 'CANCELLED').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '0 16px 60px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', paddingTop: 48 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#67bed91a', border: '1px solid #67bed930',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Ticket size={18} color="#67bed9" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
              Meus ingressos
            </h1>
          </div>
          <p style={{ fontSize: 14, color: '#555', margin: 0, paddingLeft: 52 }}>
            {isLoading ? 'Carregando...' : `${counts.ALL} ingresso${counts.ALL !== 1 ? 's' : ''} encontrado${counts.ALL !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Filter tabs */}
        {!isLoading && counts.ALL > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
            {(['ALL', 'ACTIVE', 'USED', 'CANCELLED'] as Filter[]).map(f => {
              const labels: Record<Filter, string> = {
                ALL: 'Todos', ACTIVE: 'Ativos', USED: 'Utilizados', CANCELLED: 'Cancelados',
              };
              const active = filter === f;
              if (f !== 'ALL' && counts[f] === 0) return null;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    background: active ? '#67bed9' : '#141414',
                    color: active ? '#fff' : '#666',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = '#1a1a1a'; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = '#141414'; }}}
                >
                  {labels[f]}
                  <span style={{
                    marginLeft: 6, fontSize: 11, fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.2)' : '#1e1e1e',
                    color: active ? '#fff' : '#555',
                    borderRadius: 999, padding: '1px 7px',
                  }}>
                    {counts[f]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <SkeletonList />
        ) : allTickets.length === 0 ? (
          <EmptyState />
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: '#444', fontSize: 14 }}>Nenhum ingresso nessa categoria.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map((ticket: any) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: any }) {
  const status = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.ACTIVE;
  const isActive = ticket.status === 'ACTIVE';

  return (
    <Link href={`/my-tickets/${ticket.id}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#111', border: '1px solid #1a1a1a',
          borderRadius: 16, overflow: 'hidden',
          display: 'flex', alignItems: 'stretch',
          transition: 'border-color 0.15s, background 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#67bed940';
          (e.currentTarget as HTMLDivElement).style.background = '#0c1a1f';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = '#1a1a1a';
          (e.currentTarget as HTMLDivElement).style.background = '#111';
        }}
      >
        {/* Cover strip */}
        <div style={{
          width: 80, flexShrink: 0,
          background: ticket.event?.coverImage ? 'transparent' : '#151515',
          position: 'relative', overflow: 'hidden',
        }}>
          {ticket.event?.coverImage ? (
            <img
              src={ticket.event.coverImage}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 1 : 0.4 }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Calendar size={22} color="#252525" />
            </div>
          )}
          {/* Left accent bar */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
            background: isActive ? '#67bed9' : ticket.status === 'USED' ? '#333' : '#f87171',
          }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: '16px 16px 16px 18px', overflow: 'hidden', minWidth: 0 }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: status.bg, color: status.color,
              border: `1px solid ${status.border}`,
              borderRadius: 6, padding: '2px 8px',
              flexShrink: 0,
            }}>
              {status.label}
            </span>
            <span style={{
              fontSize: 12, color: '#555',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {ticket.batch?.name}
            </span>
          </div>

          {/* Event title */}
          <p style={{
            fontSize: 15, fontWeight: 700, color: isActive ? '#fff' : '#666',
            margin: '0 0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {ticket.event?.title}
          </p>

          {/* Meta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555' }}>
              <Calendar size={11} color="#444" />
              {format(new Date(ticket.event?.startDate), "d 'de' MMM, HH:mm", { locale: ptBR })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#555' }}>
              <MapPin size={11} color="#444" />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ticket.event?.venue}
              </span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '0 16px', gap: 6, flexShrink: 0,
          borderLeft: '1px dashed #1a1a1a',
        }}>
          {isActive ? (
            <QrCode size={28} color="#67bed9" />
          ) : (
            <ChevronRight size={16} color="#2a2a2a" />
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
        background: '#111', border: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ticket size={30} color="#2a2a2a" />
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: '#333', margin: '0 0 8px' }}>
        Nenhum ingresso ainda
      </p>
      <p style={{ fontSize: 14, color: '#444', margin: '0 0 28px' }}>
        Seus ingressos aparecerão aqui após a compra.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block', padding: '12px 24px',
          borderRadius: 12, background: '#67bed9',
          color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 0 20px #67bed925',
        }}
      >
        Ver eventos disponíveis
      </Link>
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 96, borderRadius: 16, background: '#111', border: '1px solid #1a1a1a',
          overflow: 'hidden', display: 'flex',
        }}>
          <div style={{ width: 80, background: '#151515' }} />
          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ height: 12, width: '30%', background: '#1a1a1a', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 14, width: '70%', background: '#1a1a1a', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
            <div style={{ height: 11, width: '50%', background: '#151515', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
