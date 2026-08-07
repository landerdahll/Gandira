import { notFound } from 'next/navigation';
import { MapPin, Calendar, Clock, DoorOpen, ShieldCheck, TicketCheck, Building2, Globe2, Instagram } from 'lucide-react';

const TZ = 'America/Sao_Paulo';

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}
import { eventsApi } from '@/lib/api';
import { BatchSelector } from '@/components/checkout/batch-selector';
import { EventDescription } from '@/components/events/event-description';
import { SpotifyEmbed } from '@/components/events/spotify-embed';
import { getInstagramProfileUrl, InstagramLink } from '@/components/events/instagram-link';
import { EventMapLinks } from '@/components/events/event-map-links';
import { EventCarousel } from '@/components/events/event-carousel';

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
    title: `${event.title} — Pago`,
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
  const instagramProfileUrl = event.instagramUrl ? getInstagramProfileUrl(event.instagramUrl) : null;
  const isPast = endDate < new Date();
  const activeBatches = event.batches.filter((b: any) => b.status === 'ACTIVE');
  const lowestPrice = !isPast && activeBatches.length
    ? Math.min(...activeBatches.map((b: any) => Number(b.price)))
    : null;
  const heroImage = event.bannerImage ?? event.coverImage;
  const mapQuery = event.latitude != null && event.longitude != null
    ? `${event.latitude},${event.longitude}`
    : [event.venue, event.address, event.city, event.state].filter(Boolean).join(', ');
  const organizationInstagram = getOrganizationInstagramUrl(event.organization?.instagram);
  const organizationWebsite = getSafeWebsiteUrl(event.organization?.website);

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* Current dark hero: intentionally preserved for visual comparison. */}
      {event.coverImage && (
        <div className="event-cover event-hero-dark" style={{ width: '100%', height: '100%', borderRadius: '20px', overflow: 'hidden', marginBottom: '36px', position: 'relative', aspectRatio: '7 / 3' }}>
          <img
            src={event.coverImage}
            alt={event.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Age rating */}
          {event.ageRating > 0 && (
            <div style={{
              position: 'absolute', bottom: '20px', left: '24px',
              padding: '4px 10px', borderRadius: '6px',
              background: 'rgba(220,38,38,0.85)', backdropFilter: 'blur(4px)',
              color: '#fff !important', fontSize: '12px', fontWeight: 700,
            }}>
              {event.ageRating}+
            </div>
          )}
        </div>
      )}

      {/* Premium light hero. Hidden completely in dark mode. */}
      <section className={`event-hero-light${heroImage ? '' : ' event-hero-light--fallback'}`}>
        {heroImage && <img src={heroImage} alt={event.title} className="event-hero-light__image" />}
        <div className="event-hero-light__scrim" />
        <div className="event-hero-light__content">
          <h1>{event.title}</h1>
          <div className="event-hero-light__facts">
            <span><Calendar size={18} /> <span style={{ textTransform: 'capitalize' }}>{fmtDate(startDate)}</span></span>
            <span><Clock size={18} /> {fmtTime(startDate)} – {fmtTime(endDate)}</span>
            <span><MapPin size={18} /> {event.venue} · {event.city}/{event.state}</span>
            <span className="event-hero-light__rating">{event.ageRating > 0 ? `${event.ageRating}+` : 'Livre'}</span>
          </div>
        </div>
      </section>

      {/* Two-column grid */}
      <div className="event-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', alignItems: 'start' }}>

        {/* ── LEFT: details ──────────────────────────────────────────── */}
        <div className="event-detail-content">

          {/* Title + producer */}
          <div className="event-dark-intro">
          <h1 className="event-title" style={{ fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '8px' }}>
            {event.title}
          </h1>
          <p style={{ color: '#555', fontSize: '14px', marginBottom: '28px' }}>
            por {event.producer?.name}
          </p>

          <Divider />
          </div>

          {/* Date / time / location */}
          <div className="event-dark-facts" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '24px 0' }}>
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

          <div className="event-dark-facts"><Divider /></div>

          {/* Description */}
          <EventDescription description={event.description} />

          <section className="event-premium-section event-venue-section">
            <div className="event-section-icon"><Building2 size={19} /></div>
            <div className="event-section-copy">
              <p className="event-section-kicker">Local</p>
              <h2>{event.venue}</h2>
              <p>{event.address}</p>
              <p>{event.city}/{event.state}{event.zipCode ? ` · CEP ${event.zipCode}` : ''}</p>
              <EventMapLinks query={mapQuery} />
            </div>
          </section>

          <section className="event-premium-section event-important-section">
            <p className="event-section-kicker">Informações importantes</p>
            <div className="event-important-grid">
              <ImportantItem icon={<ShieldCheck size={18} />} label="Classificação" value={event.ageRating > 0 ? `${event.ageRating} anos` : 'Livre'} />
              <ImportantItem icon={<DoorOpen size={18} />} label="Abertura de portas" value={doorsOpen ? fmtTime(doorsOpen) : 'No horário do evento'} />
              <ImportantItem icon={<TicketCheck size={18} />} label="Ingresso" value="Apresente o QR Code na entrada." />
              <ImportantItem icon={<Calendar size={18} />} label="Cancelamento" value="Gratuito em até 7 dias após a compra e até 48h antes do evento." />
            </div>
          </section>

          {event.organization && (
            <section className="event-premium-section event-organization-section">
              <p className="event-section-kicker">Apresentado por</p>
              <div className="event-organization-card">
                {event.organization.logoUrl ? (
                  <img src={event.organization.logoUrl} alt={`Logo ${event.organization.name}`} />
                ) : (
                  <span className="event-organization-fallback">{event.organization.name.slice(0, 1)}</span>
                )}
                <div>
                  <h2>{event.organization.name}</h2>
                  <div className="event-organization-links">
                    {organizationInstagram && <a href={organizationInstagram} target="_blank" rel="noopener noreferrer"><Instagram size={15} /> Instagram</a>}
                    {organizationWebsite && <a href={organizationWebsite} target="_blank" rel="noopener noreferrer"><Globe2 size={15} /> Website</a>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {event.spotifyUrl && (
            <>
              <Divider />
              <SpotifyEmbed url={event.spotifyUrl} />
            </>
          )}

          {instagramProfileUrl && (
            <>
              <Divider />
              <InstagramLink url={instagramProfileUrl} />
            </>
          )}

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
                  {lowestPrice > 0 && <span style={{ fontSize: '13px', color: '#555', fontWeight: 400, marginLeft: '4px' }}>a partir de + taxas</span>}
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

      {event.organization && event.relatedEvents?.length > 0 && (
        <section className="event-related-section">
          <EventCarousel title={`Outros eventos de ${event.organization.name}`} events={event.relatedEvents} />
        </section>
      )}
    </div>
  );
}

function ImportantItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="event-important-item"><span>{icon}</span><div><strong>{label}</strong><p>{value}</p></div></div>;
}

function getSafeWebsiteUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

function getOrganizationInstagramUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith('@')) return `https://www.instagram.com/${encodeURIComponent(value.slice(1))}`;
  if (!value.includes('://')) return `https://www.instagram.com/${encodeURIComponent(value.replace(/^@/, ''))}`;
  return getInstagramProfileUrl(value);
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
