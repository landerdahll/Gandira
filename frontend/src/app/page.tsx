import { FeaturedEventCard } from '@/components/events/featured-event-card';
import { EventCarousel } from '@/components/events/event-carousel';
import { EventStateSelector } from '@/components/events/event-state-selector';
import { eventsApi } from '@/lib/api';
import { cookies, headers } from 'next/headers';
import {
  EVENT_STATE_PREFERENCE_COOKIE,
  EventStateFilter,
  eventStateFilterFromCookie,
  isSupportedEventState,
} from '@/lib/event-states';

export const dynamic = 'force-dynamic';

interface SearchParams {
  city?: string;
  category?: string;
  search?: string;
  page?: string;
  state?: string;
}

async function getUpcoming(params: SearchParams, state?: string) {
  try {
    const res = await eventsApi.list({
      city: params.city,
      state,
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

async function getPast(state?: string) {
  try {
    const res = await eventsApi.list({ past: 'true', limit: 10, state });
    return res.data.data as any[];
  } catch {
    return [];
  }
}

async function getFeatured(state?: string) {
  try {
    const res = await eventsApi.featured({ state });
    return res.data;
  } catch {
    return null;
  }
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const hasFilters = !!(searchParams.city || searchParams.category || searchParams.search);
  const savedState = eventStateFilterFromCookie(cookies().get(EVENT_STATE_PREFERENCE_COOKIE)?.value);
  const country = headers().get('x-vercel-ip-country')?.toUpperCase();
  const detectedRegion = headers().get('x-vercel-ip-country-region')?.toUpperCase();
  const detectedState: EventStateFilter = country === 'BR' && isSupportedEventState(detectedRegion)
    ? detectedRegion
    : 'ALL';
  const selectedState = savedState ?? detectedState;
  const apiState = selectedState === 'ALL' ? undefined : selectedState;

  const [upcoming, pastEvents, featuredEvent] = await Promise.all([
    getUpcoming(searchParams, apiState),
    hasFilters ? Promise.resolve([]) : getPast(apiState),
    hasFilters ? Promise.resolve(null) : getFeatured(apiState),
  ]);

  const upcomingEvents: any[] = upcoming.data;
  const featured = !hasFilters ? featuredEvent : null;
  const rest = featured
    ? upcomingEvents.filter((event: any) => event.id !== featured.id)
    : upcomingEvents;
  const visiblePastEvents = (featured
    ? pastEvents.filter((event: any) => event.id !== featured.id)
    : pastEvents
  ).sort((a: any, b: any) => {
    const endedAt = (event: any) => new Date(event.endDate ?? event.startDate).getTime();
    return endedAt(b) - endedAt(a);
  });

  return (
    <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px 80px' }}>
      <div className="event-state-filter-row">
        <EventStateSelector selected={selectedState} />
      </div>

      {!featured && upcomingEvents.length === 0 && visiblePastEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '112px 0' }}>
          <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🎵</p>
          <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--theme-text)' }}>
            {selectedState === 'ALL' ? 'Nenhum evento encontrado' : `Ainda não temos eventos programados em ${selectedState}.`}
          </p>
          <p style={{ fontSize: '14px', marginTop: '4px', color: '#444' }}>
            {selectedState === 'ALL' ? 'Tente outros filtros ou volte em breve' : 'Escolha outro estado ou volte em breve'}
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
            <div style={{ marginBottom: '56px' }} className="home-event-section">
              <EventCarousel title="Próximos eventos" events={rest} />

              {upcoming.meta.lastPage > 1 && (
                <Pagination currentPage={upcoming.meta.page} totalPages={upcoming.meta.lastPage} searchParams={searchParams} />
              )}
            </div>
          )}

          {/* Eventos Passados */}
          {visiblePastEvents.length > 0 && (
            <EventCarousel title="Eventos passados" events={visiblePastEvents} kind="past" />
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

function Pagination({ currentPage, totalPages, searchParams }: { currentPage: number; totalPages: number; searchParams: SearchParams }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '48px' }}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <a
          key={page}
          href={`?${new URLSearchParams({
            ...Object.fromEntries(Object.entries(searchParams).filter(([, value]) => value !== undefined)) as Record<string, string>,
            page: String(page),
          }).toString()}`}
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
