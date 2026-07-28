import Link from 'next/link';

export function EventSectionHeader({ title, allHref }: { title: string; allHref?: string }) {
  return <header className="event-section-header">
    <h2 className="event-section-title">{title}</h2>
    {allHref && <Link href={allHref} className="event-section-all">Ver todos</Link>}
  </header>;
}
