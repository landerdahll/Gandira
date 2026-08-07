'use client';

import { useRef } from 'react';
import { EventCard, EventSummary } from './event-card';
import { EventSectionHeader } from './event-section-header';

interface EventCarouselProps {
  title: string;
  events: EventSummary[];
  kind?: 'upcoming' | 'past';
  allHref?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export function EventCarousel({ title, events, kind = 'upcoming', allHref, loading = false, emptyMessage = 'Nenhum evento disponível.' }: EventCarouselProps) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  if (!loading && events.length === 0) return <section className="event-discovery-section"><EventSectionHeader title={title} allHref={allHref}/><p className="event-carousel-empty">{emptyMessage}</p></section>;

  return <section className="event-discovery-section" aria-labelledby={`event-section-${kind}`}>
    <div id={`event-section-${kind}`}><EventSectionHeader title={title} allHref={allHref}/></div>
    <div
      className={`event-carousel${kind === 'past' ? ' event-carousel--past' : ''}`}
      role="region"
      aria-roledescription="carrossel"
      aria-label={title}
      tabIndex={0}
      onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY }; dragged.current = false; }}
      onPointerMove={event => {
        if (!pointerStart.current) return;
        if (Math.abs(event.clientX - pointerStart.current.x) > 8 || Math.abs(event.clientY - pointerStart.current.y) > 8) dragged.current = true;
      }}
      onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); } }}
      onPointerUp={() => { pointerStart.current = null; requestAnimationFrame(() => { dragged.current = false; }); }}
      onPointerCancel={() => { pointerStart.current = null; dragged.current = false; }}
    >
      {loading
        ? Array.from({ length: 4 }, (_, index) => <div key={index} className="compact-event-card compact-event-card--skeleton" aria-hidden="true"><div className="compact-event-card__media"/><div className="compact-event-card__body"><span/><span/><span/></div></div>)
        : events.map(event => <EventCard key={event.id} event={event} past={kind === 'past'}/>)}
    </div>
  </section>;
}
