'use client';

import { useId, useRef, useState } from 'react';
import { truncateEventDescription } from '@/lib/truncate-event-description';

type EventDescriptionProps = {
  description: string;
};

export function EventDescription({ description }: EventDescriptionProps) {
  const contentId = useId();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const preview = truncateEventDescription(description);

  function toggleDescription() {
    if (expanded) {
      setExpanded(false);
      requestAnimationFrame(() => {
        if ((sectionRef.current?.getBoundingClientRect().top ?? 0) < 0) {
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          sectionRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }
      });
      return;
    }
    setExpanded(true);
  }

  return (
    <div ref={sectionRef} className="event-description" style={{ padding: '24px 0' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--theme-text)', marginBottom: '12px' }}>
        Sobre o evento
      </h2>
      <p id={contentId} className="event-description__content" style={{ color: 'var(--theme-text-secondary)', lineHeight: 1.75, fontSize: '14px', whiteSpace: 'pre-wrap' }}>
        <span className="event-description__desktop-text">{description}</span>
        <span className="event-description__mobile-text">{expanded ? description : preview.text}</span>
      </p>
      {preview.truncated && (
        <button
          type="button"
          className="event-description__toggle"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={toggleDescription}
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  );
}
