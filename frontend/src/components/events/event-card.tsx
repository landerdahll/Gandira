import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  coverImage?: string | null;
  venue: string;
  city: string;
  state: string;
  startDate: string;
  category?: string | null;
  batches: Array<{ price: number; name: string }>;
}

export function EventCard({ event, past = false }: { event: EventSummary; past?: boolean }) {
  const lowestPrice = event.batches.length ? Math.min(...event.batches.map(batch => Number(batch.price))) : null;
  const dateLabel = format(new Date(event.startDate), "EEE',' dd 'de' MMM", { locale: ptBR });

  return (
    <Link
      href={`/events/${event.slug}`}
      className={`compact-event-card${past ? ' compact-event-card--past' : ''}`}
      aria-label={`${event.title}, ${dateLabel}, ${event.venue}`}
    >
      <div className="compact-event-card__media">
        {event.coverImage ? (
          <img
            src={event.coverImage}
            alt={`Capa do evento ${event.title}`}
            loading="lazy"
            decoding="async"
            className="compact-event-card__image"
          />
        ) : (
          <div className="compact-event-card__fallback" role="img" aria-label="Evento sem imagem">P</div>
        )}
        {past && <span className="compact-event-card__badge">Encerrado</span>}
      </div>

      <div className="compact-event-card__body">
        <h3 className="compact-event-card__title">{event.title}</h3>
        <p className="compact-event-card__date">{dateLabel}</p>
        <p className="compact-event-card__venue" title={`${event.venue} · ${event.city}`}>{event.venue || event.city}</p>
        {!past && lowestPrice !== null && (
          <p className="compact-event-card__price">
            {lowestPrice === 0 ? 'Grátis' : `A partir de ${formatCurrency(lowestPrice)}`}
          </p>
        )}
      </div>
    </Link>
  );
}
