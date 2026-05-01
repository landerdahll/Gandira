import { EventCard } from '@/components/events/event-card';
import { FeaturedEventCard } from '@/components/events/featured-event-card';
import { eventsApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface SearchParams {
  city?: string;
  category?: string;
  search?: string;
  page?: string;
}

async function getUpcoming(params: SearchParams) {
  try {
    const res = await eventsApi.list({
      city: params.city,
      category: params.category,
      search: params.search,
      limit: 21,
      page: params.page ? parseInt(params.page) : 1,
    });
    return res.data;
  } catch {
    return { data: [], meta: { total: 0, page: 1, lastPage: 1 } };
  }
}

async function getPast() {
  try {
    const res = await eventsApi.list({ past: 'true', limit: 10 });
    return res.data.data as any[];
  } catch {
    return [];
  }
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const hasFilters = !!(searchParams.city || searchParams.category || searchParams.search);

  const [upcoming, pastEvents] = await Promise.all([
    getUpcoming(searchParams),
    hasFilters ? Promise.resolve([]) : getPast(),
  ]);

  const upcomingEvents: any[] = upcoming.data;
  const featured = !hasFilters && upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  const rest = featured ? upcomingEvents.slice(1) : upcomingEvents;

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '112px 0' }}>
          <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🎵</p>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Nenhum evento encontrado</p>
          <p style={{ fontSize: '14px', marginTop: '4px', color: '#444' }}>
            Tente outros filtros ou volte em breve
          </p>
        </div>
      ) : (
        <>
          {/* Em Destaque */}
          {featured && (
            <section style={{ marginBottom: '48px' }}>
              <SectionTitle>Em Destaque</SectionTitle>
              <FeaturedEventCard event={featured} />
            </section>
          )}

          {/* Próximos Eventos */}
          {rest.length > 0 && (
            <section style={{ marginBottom: '56px' }}>
              <SectionTitle>{featured ? 'Próximos Eventos' : 'Eventos'}</SectionTitle>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '20px',
              }}>
                {rest.map((event: any) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>

              {upcoming.meta.lastPage > 1 && (
                <Pagination currentPage={upcoming.meta.page} totalPages={upcoming.meta.lastPage} />
              )}
            </section>
          )}

          {/* Eventos Passados */}
          {pastEvents.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <SectionTitle>Eventos Passados</SectionTitle>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '20px',
              }}>
                {pastEvents.map((event: any) => (
                  <EventCard key={event.id} event={event} past />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </h2>
  );
}

function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '48px' }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <a
          key={page}
          href={`?page=${page}`}
          style={
            page === currentPage
              ? { padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: '#67bed9', color: '#fff', textDecoration: 'none' }
              : { padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, background: '#1a1a1a', color: '#666', border: '1px solid #252525', textDecoration: 'none' }
          }
        >
          {page}
        </a>
      ))}
    </div>
  );
}
