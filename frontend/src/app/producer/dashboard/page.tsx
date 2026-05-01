'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { eventsApi, reportsApi } from '@/lib/api';
import { Plus, BarChart2, Eye, EyeOff, Calendar, MapPin, ChevronRight, TrendingUp, Ticket, Users, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

function fmtCurrency(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Rascunho',  color: '#888',    bg: '#1a1a1a' },
  PUBLISHED: { label: 'Publicado', color: '#67bed9', bg: '#0d1e28' },
  CANCELLED: { label: 'Cancelado', color: '#ff6b6b', bg: '#220000' },
  FINISHED:  { label: 'Encerrado', color: '#555',    bg: '#111' },
};

export default function ProducerDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [showRevenue, setShowRevenue] = useState(false);

  async function load() {
    try {
      const [evRes, dashRes] = await Promise.all([
        eventsApi.myEvents(),
        reportsApi.dashboard(),
      ]);
      setEvents(evRes.data.data);
      setSummary(dashRes.data.summary);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handlePublish(id: string) {
    setPublishing(id);
    try {
      await eventsApi.publish(id);
      toast.success('Evento publicado!');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao publicar');
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>Dashboard</h1>
          <p style={{ fontSize: '14px', color: '#555' }}>Gerencie seus eventos e acompanhe resultados</p>
        </div>
        <Link href="/producer/events/new" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 20px', borderRadius: '12px',
          background: '#67bed9', color: '#fff',
          fontWeight: 700, fontSize: '14px', textDecoration: 'none',
        }}>
          <Plus size={16} /> Novo Evento
        </Link>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
          <StatCard icon={<Calendar size={18} color="#67bed9" />} label="Eventos criados" value={summary.events} />
          <StatCard icon={<Ticket size={18} color="#67bed9" />} label="Ingressos vendidos" value={summary.totalTicketsSold} />
          <StatCard icon={<DollarSign size={18} color="#67bed9" />} label="Receita total" value={showRevenue ? fmtCurrency(summary.totalRevenue) : 'R$ ••••••'} onToggle={() => setShowRevenue(v => !v)} showRevenue={showRevenue} />
        </div>
      )}

      {/* Events */}
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
        Meus Eventos
      </h2>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: '88px', borderRadius: '16px', background: '#141414', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          border: '1px dashed #252525', borderRadius: '20px',
        }}>
          <p style={{ fontSize: '36px', marginBottom: '12px' }}>🎪</p>
          <p style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Nenhum evento criado</p>
          <p style={{ fontSize: '13px', color: '#444', marginBottom: '24px' }}>Crie seu primeiro evento e comece a vender</p>
          <Link href="/producer/events/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 24px', borderRadius: '12px',
            background: '#67bed9', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none',
          }}>
            <Plus size={15} /> Criar Evento
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((event: any) => {
            const s = STATUS[event.status] ?? STATUS.DRAFT;
            const sold = event.batches?.reduce((a: number, b: any) => a + b.sold, 0) ?? 0;
            const revenue = event.batches?.reduce((a: number, b: any) => a + b.sold * Number(b.price), 0) ?? 0;

            return (
              <div key={event.id} className="event-card" style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px',
                background: '#141414', border: '1px solid #1e1e1e', borderRadius: '16px',
              }}>
                {/* Cover */}
                <div style={{ width: '52px', height: '52px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                  {event.coverImage
                    ? <img src={event.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎵</div>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', color: s.color, background: s.bg, flexShrink: 0 }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', wordBreak: 'break-word' }}>
                      {event.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Pill icon={<Calendar size={11} />}>{fmtDate(event.startDate)}</Pill>
                    <Pill icon={<MapPin size={11} />}>{event.venue}</Pill>
                    <Pill icon={<Ticket size={11} />}>{sold} vendidos</Pill>
                    {revenue > 0 && <Pill icon={<TrendingUp size={11} />} highlight>{showRevenue ? fmtCurrency(revenue) : 'R$ ••••••'}</Pill>}
                  </div>
                </div>

                {/* Actions */}
                <div className="event-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {event.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePublish(event.id)}
                      disabled={publishing === event.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '8px 14px', borderRadius: '8px', border: 'none',
                        background: '#67bed9', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                        opacity: publishing === event.id ? 0.5 : 1,
                      }}
                    >
                      <Eye size={13} />
                      {publishing === event.id ? '...' : 'Publicar'}
                    </button>
                  )}
                  <Link
                    href={`/producer/events/${event.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '8px 14px', borderRadius: '8px',
                      background: '#1a1a1a', border: '1px solid #252525',
                      color: '#888', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <BarChart2 size={13} /> Ver analytics
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, onToggle, showRevenue }: { icon: React.ReactNode; label: string; value: any; onToggle?: () => void; showRevenue?: boolean }) {
  return (
    <div style={{ padding: '20px', background: '#141414', border: '1px solid #1e1e1e', borderRadius: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {icon}
        <span style={{ fontSize: '12px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        {onToggle && (
          <button onClick={onToggle} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 0, display: 'flex', alignItems: 'center' }}>
            {showRevenue ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      <p style={{ fontSize: '26px', fontWeight: 800, color: '#fff' }}>{value}</p>
    </div>
  );
}

function Pill({ icon, children, highlight }: { icon: React.ReactNode; children: React.ReactNode; highlight?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: highlight ? '#67bed9' : '#555' }}>
      {icon}{children}
    </span>
  );
}
