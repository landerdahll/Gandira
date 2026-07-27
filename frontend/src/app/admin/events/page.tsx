'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Search, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminNavigation } from '@/components/admin/admin-navigation';
import { eventsApi } from '@/lib/api';

type AdminEvent = {
  id: string;
  title: string;
  coverImage?: string | null;
  venue: string;
  city: string;
  state: string;
  startDate: string;
  endDate: string;
  status: string;
  featured: boolean;
  producer: { name: string };
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, lastPage: 1 });
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const timer = useRef<NodeJS.Timeout | null>(null);

  async function load(query = search, page = 1) {
    setLoading(true);
    try {
      const response = await eventsApi.adminList({ page, limit: 50, ...(query && { search: query }) });
      setEvents(response.data.data);
      setMeta(response.data.meta);
    } catch {
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(''); }, []);

  function handleSearch(value: string) {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => load(value, 1), 350);
  }

  async function toggleFeatured(event: AdminEvent) {
    setActing(event.id);
    try {
      const featured = !event.featured;
      await eventsApi.setFeatured(event.id, featured);
      setEvents(current => current.map(item => item.id === event.id ? { ...item, featured } : item));
      toast.success(featured ? 'Evento adicionado aos destaques' : 'Evento removido dos destaques');
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Erro ao atualizar destaque');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="master-events-panel" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
      <AdminNavigation />

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, margin: '26px 0 28px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <CalendarDays size={20} color="var(--theme-primary)" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--theme-text)' }}>Eventos</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--theme-text-secondary)' }}>
            Selecione um ou mais eventos para priorizar o destaque da Home.
          </p>
        </div>

        <div style={{ position: 'relative', width: 'min(100%, 340px)' }}>
          <Search size={15} color="var(--theme-text-secondary)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={event => handleSearch(event.target.value)}
            placeholder="Buscar evento, local ou cidade..."
            style={{ width: '100%', padding: '10px 14px 10px 36px', background: 'var(--theme-surface-raised)', border: '1px solid var(--theme-border)', borderRadius: 12, color: 'var(--theme-text)', fontSize: 14, outline: 'none' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[1, 2, 3, 4].map(item => <div key={item} style={{ height: 92, borderRadius: 14, background: 'var(--theme-surface-raised)' }} />)}
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '72px 0', color: 'var(--theme-text-secondary)' }}>Nenhum evento encontrado.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {events.map(event => {
            const ended = new Date(event.endDate) <= new Date();
            return (
              <article key={event.id} className="master-event-card" style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) auto', alignItems: 'center', gap: 16, padding: 12, borderRadius: 14, border: '1px solid var(--theme-border)', background: 'var(--theme-surface-raised)' }}>
                <div style={{ width: 72, height: 64, borderRadius: 10, overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'var(--theme-surface)' }}>
                  {event.coverImage ? <img src={event.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CalendarDays size={22} color="var(--theme-text-secondary)" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--theme-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</h2>
                  <p style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginTop: 4 }}>
                    {new Date(event.startDate).toLocaleString('pt-BR')} · {event.venue}, {event.city}/{event.state}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--theme-text-secondary)', marginTop: 3 }}>{event.producer.name} · {event.status}</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, color: ended ? 'var(--theme-text-secondary)' : 'var(--theme-text)', fontSize: 13, fontWeight: 600, cursor: ended ? 'not-allowed' : 'pointer', opacity: acting === event.id ? 0.55 : 1 }}>
                  <input type="checkbox" checked={event.featured} disabled={ended || acting === event.id} onChange={() => toggleFeatured(event)} style={{ width: 18, height: 18, accentColor: 'var(--theme-primary)' }} />
                  <Star size={16} fill={event.featured ? 'currentColor' : 'none'} color={event.featured ? '#f6c453' : 'currentColor'} />
                  <span>{ended ? 'Evento encerrado' : 'Evento em destaque'}</span>
                </label>
              </article>
            );
          })}
        </div>
      )}

      {!loading && meta.lastPage > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 }}>
          <button type="button" disabled={meta.page <= 1} onClick={() => load(search, meta.page - 1)} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)', cursor: meta.page <= 1 ? 'not-allowed' : 'pointer', opacity: meta.page <= 1 ? 0.45 : 1 }}>Anterior</button>
          <span style={{ color: 'var(--theme-text-secondary)', fontSize: 13 }}>{meta.page} de {meta.lastPage} · {meta.total} eventos</span>
          <button type="button" disabled={meta.page >= meta.lastPage} onClick={() => load(search, meta.page + 1)} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)', cursor: meta.page >= meta.lastPage ? 'not-allowed' : 'pointer', opacity: meta.page >= meta.lastPage ? 0.45 : 1 }}>Próxima</button>
        </div>
      )}
    </div>
  );
}
