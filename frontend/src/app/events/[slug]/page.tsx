import { notFound } from 'next/navigation';
import { MapPin, Calendar, Clock } from 'lucide-react';

const TZ = 'America/Sao_Paulo';

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}
import { eventsApi } from '@/lib/api';
import { BatchSelector } from '@/components/checkout/batch-selector';

async function getEvent(slug: string) {
  try {
    const res = await eventsApi.get(slug);
    return res.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);
  if (!event) return {};
  return {
    title: `${event.title} — Gandira`,
    description: event.description?.slice(0, 160),
    openGraph: { images: event.coverImage ? [event.coverImage] : [] },
  };
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEvent(params.slug);
  if (!event) notFound();

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const doorsOpen = event.doorsOpen ? new Date(event.doorsOpen) : null;
  const isPast = endDate < new Date();
  const activeBatches = event.batches.filter((b: any) => b.status === 'ACTIVE');
  const lowestPrice = !isPast && activeBatches.length
    ? Math.min(...activeBatches.map((b: any) => Number(b.price)))
    : null;

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Cover image */}
      {event.coverImage && (
        <div className="event-cover" style={{ width: '100%', height: '420px', borderRadius: '20px', overflow: 'hidden', marginBottom: '36px', position: 'relative' }}>
          <img
            src={event.coverImage}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* bottom gradient */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
            background: 'linear-gradient(to top, rgba(10,10,10,0.85) 0%, transparent 100%)',
          }} />
          {/* Age rating */}
          {event.ageRating > 0 && (
            <div style={{
              position: 'absolute', bottom: '20px', left: '24px',
              padding: '4px 10px', borderRadius: '6px',
              background: 'rgba(220,38,38,0.85)', backdropFilter: 'blur(4px)',
              color: '#fff', fontSize: '12px', fontWeight: 700,
            }}>
              {event.ageRating}+
            </div>
          )}
        </div>
      )}

      {/* Two-column grid */}
      <div className="event-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', alignItems: 'start' }}>

        {/* ── LEFT: details ──────────────────────────────────────────── */}
        <div>

          {/* Title + producer */}
          <h1 className="event-title" style={{ fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '8px' }}>
            {event.title}
          </h1>
          <p style={{ color: '#555', fontSize: '14px', marginBottom: '28px' }}>
            por {event.producer?.name}
          </p>

          <Divider />

          {/* Date / time / location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px 0' }}>
            <InfoRow icon={<Calendar size={16} color="#67bed9" />}>
              <span style={{ textTransform: 'capitalize' }}>
                {fmtDate(startDate)}
              </span>
            </InfoRow>
            <InfoRow icon={<Clock size={16} color="#67bed9" />}>
              {fmtTime(startDate)} – {fmtTime(endDate)}
              {doorsOpen && (
                <span style={{ color: '#555', marginLeft: '12px', fontSize: '13px' }}>
                  (Portões: {fmtTime(doorsOpen)})
                </span>
              )}
            </InfoRow>
            <InfoRow icon={<MapPin size={16} color="#67bed9" />}>
              {event.venue} · {event.address}, {event.city}/{event.state}
            </InfoRow>
          </div>

          <Divider />

          {/* Description */}
          <div style={{ padding: '24px 0' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
              Sobre o evento
            </h2>
            <p style={{ color: '#888', lineHeight: 1.75, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
              {event.description}
            </p>
          </div>

          {/* Tags */}
          {event.tags?.length > 0 && (
            <>
              <Divider />
              <div style={{ padding: '20px 0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {event.tags.map((tag: string) => (
                  <span key={tag} style={{
                    padding: '4px 12px', borderRadius: '999px',
                    background: '#1a1a1a', border: '1px solid #252525',
                    color: '#666', fontSize: '13px',
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: purchase widget ──────────────────────────────────── */}
        <div className="purchase-widget-sticky" style={{ position: 'sticky', top: '80px' }}>
          <div style={{
            background: '#141414',
            border: '1px solid #1e1e1e',
            borderRadius: '20px',
            overflow: 'hidden',
          }}>
            {/* Widget header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #1e1e1e' }}>
              <p style={{ fontSize: '12px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {isPast ? 'Evento encerrado' : 'Ingressos'}
              </p>
              {!isPast && lowestPrice !== null && (
                <p style={{ fontSize: '26px', fontWeight: 800, color: '#fff' }}>
                  {lowestPrice === 0 ? 'Gratuito' : `R$ ${lowestPrice.toFixed(2).replace('.', ',')}`}
                  {lowestPrice > 0 && <span style={{ fontSize: '13px', color: '#555', fontWeight: 400, marginLeft: '4px' }}>a partir de</span>}
                </p>
              )}
            </div>

            {/* Batch selector */}
            <div style={{ padding: '16px 20px 20px' }}>
              {isPast ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#555', marginBottom: '4px' }}>Evento encerrado</p>
                  <p style={{ fontSize: '12px', color: '#3a3a3a' }}>As vendas foram fechadas</p>
                </div>
              ) : activeBatches.length > 0 ? (
                <BatchSelector eventId={event.id} batches={event.batches} />
              ) : (
                <p style={{ textAlign: 'center', color: '#555', padding: '20px 0', fontSize: '14px' }}>
                  Vendas encerradas
                </p>
              )}
            </div>

            {/* Footer note */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #1a1a1a', background: '#0d0d0d' }}>
              <p style={{ fontSize: '11px', color: '#444', textAlign: 'center' }}>
                Cancelamento gratuito em até 7 dias após a compra
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: 'linear-gradient(to right, #1e1e1e, #2a2a2a 40%, #1e1e1e)' }} />;
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#ccc' }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}
