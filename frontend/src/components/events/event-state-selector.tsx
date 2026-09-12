'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  EVENT_STATE_PREFERENCE_KEY,
  EVENT_STATE_PREFERENCE_COOKIE,
  EventStateFilter,
  SUPPORTED_EVENT_STATES,
  eventStateFilterToCookie,
} from '@/lib/event-states';

export function EventStateSelector({ selected }: { selected: EventStateFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const explicitState = searchParams.get('state');

  const persistState = (state: EventStateFilter) => {
    window.localStorage.setItem(EVENT_STATE_PREFERENCE_KEY, state);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${EVENT_STATE_PREFERENCE_COOKIE}=${eventStateFilterToCookie(state)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  };

  useEffect(() => {
    if (explicitState === 'ALL' || SUPPORTED_EVENT_STATES.includes(explicitState as typeof SUPPORTED_EVENT_STATES[number])) {
      persistState(explicitState as EventStateFilter);
    }
  }, [explicitState]);

  const navigate = (state: EventStateFilter, city?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (city) params.set('city', city);
    else params.delete('city');
    params.set('state', state);
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false });
  };

  const changeState = (state: EventStateFilter, city?: string) => {
    persistState(state);
    navigate(state, city);
  };

  const isPortoAlegre = searchParams.get('city')?.toLowerCase() === 'porto alegre';

  return (
    <div className="event-state-selector" aria-label="Filtrar eventos por cidade">
      <label className="event-state-selector__legacy-label">
        <span>Eventos em:</span>
        <select aria-label="Filtrar eventos por estado" value={selected}
          onChange={event => changeState(event.target.value as EventStateFilter)}>
          <option value="ALL">Todos</option>
          {SUPPORTED_EVENT_STATES.map(state => <option key={state} value={state}>{state}</option>)}
        </select>
      </label>
      <button type="button" className={!isPortoAlegre ? 'is-selected' : ''} aria-pressed={!isPortoAlegre}
        onClick={() => changeState('ALL')}>Todas</button>
      <button type="button" className={isPortoAlegre ? 'is-selected' : ''} aria-pressed={isPortoAlegre}
        onClick={() => changeState('RS', 'Porto Alegre')}>Porto Alegre</button>
      <span className="event-state-selector__legacy-state" aria-hidden="true">{selected}</span>
    </div>
  );
}
