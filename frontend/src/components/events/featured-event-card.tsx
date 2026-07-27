import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface FeaturedEventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    coverImage?: string;
    bannerImage?: string;
    venue: string;
    city: string;
    state: string;
    startDate: string;
    batches: Array<{ price: number; name: string }>;
  };
}

export function FeaturedEventCard({ event }: FeaturedEventCardProps) {
  const lowestPrice = event.batches.length
    ? Math.min(...event.batches.map((b) => Number(b.price)))
    : null;

  const dateLabel = format(new Date(event.startDate), "EEE',' dd 'de' MMMM", { locale: ptBR });
  const timeLabel = format(new Date(event.startDate), 'HH:mm', { locale: ptBR });
  const shortDesc = event.description
    ? event.description.slice(0, 200) + (event.description.length > 200 ? '...' : '')
    : null;
  const image = event.bannerImage || event.coverImage;

  return (
    <div
      className="featured-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#141414',
        border: '1px solid #1e1e1e',
      }}
    >
      {/* Image */}
      <Link
        href={`/events/${event.slug}`}
        className="featured-card-img"
        style={{ display: 'block', width: '100%', aspectRatio: '21 / 8', background: '#1e1e1e' }}
      >
        {image ? (
          <img
            src={image}
            alt={event.title}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1e1e1e',
              fontSize: '3rem',
            }}
          >
            🎵
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="featured-card-body" style={{ padding: '28px 32px 30px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div>
          <Link href={`/events/${event.slug}`} style={{ textDecoration: 'none' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1.2,
                marginBottom: '16px',
              }}
              className="hover:text-[#67bed9] transition-colors"
            >
              {event.title}
            </h2>
          </Link>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#67bed9', fontWeight: 500, textTransform: 'capitalize' }}>
              <Calendar size={14} />
              <span>{dateLabel} · {timeLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#888' }}>
              <MapPin size={14} />
              <span>{event.venue} · {event.city}, {event.state}</span>
            </div>
          </div>

          {shortDesc && (
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#666' }}>
              {shortDesc}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '20px' }}>
          {lowestPrice !== null && (
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#aaa' }}>
              {lowestPrice === 0 ? 'Gratuito' : `A partir de ${formatCurrency(lowestPrice)} + taxas`}
            </p>
          )}
          <Link
            href={`/events/${event.slug}`}
            style={{
              flexShrink: 0,
              padding: '10px 24px',
              borderRadius: '999px',
              background: '#67bed9',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Comprar agora
          </Link>
        </div>
      </div>
    </div>
  );
}
