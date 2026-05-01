import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    slug: string;
    coverImage?: string;
    venue: string;
    city: string;
    state: string;
    startDate: string;
    batches: Array<{ price: number; name: string }>;
  };
  past?: boolean;
}

export function EventCard({ event, past }: EventCardProps) {
  const lowestPrice = event.batches.length
    ? Math.min(...event.batches.map((b) => Number(b.price)))
    : null;

  const dateLabel = format(new Date(event.startDate), "EEE',' dd 'de' MMM", { locale: ptBR });

  return (
    <Link href={`/events/${event.slug}`} className="group block" style={{ textDecoration: 'none', color: 'inherit' }}>
      {/* Image */}
      <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', background: '#1e1e1e' }}>
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt={event.title}
            loading="lazy"
            className="group-hover:scale-105"
            style={{
              display: 'block',
              width: '100%',
              aspectRatio: '1 / 1',
              objectFit: 'cover',
              transition: 'transform 0.35s',
              opacity: past ? 0.55 : 1,
              filter: past ? 'grayscale(40%)' : 'none',
            }}
          />
        ) : (
          <div style={{
            width: '100%', aspectRatio: '1 / 1',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', opacity: past ? 0.5 : 1,
          }}>
            🎵
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ paddingTop: '12px', paddingBottom: '4px', fontFamily: 'var(--font-montserrat), Arial, sans-serif' }}>
        <h3
          className="group-hover:text-[#67bed9] transition-colors"
          style={{
            fontWeight: 700,
            color: past ? '#777' : '#fff',
            fontSize: '15px',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '6px',
          }}
        >
          {event.title}
        </h3>
        <p style={{ fontSize: '13px', fontWeight: 600, color: past ? '#555' : '#67bed9', marginBottom: '3px', textTransform: 'capitalize' }}>
          {dateLabel}
        </p>
        <p style={{ fontSize: '13px', color: past ? '#444' : '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>
          {event.venue}
        </p>
        {!past && lowestPrice !== null && (
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
            {lowestPrice === 0 ? 'Gratuito' : `A partir de ${formatCurrency(lowestPrice)}`}
          </p>
        )}
        {past && (
          <p style={{ fontSize: '12px', color: '#444', fontWeight: 600 }}>Encerrado</p>
        )}
      </div>
    </Link>
  );
}
