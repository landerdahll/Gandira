'use client';

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
  const navigate = (state: EventStateFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (state === 'ALL') params.delete('state');
    else params.set('state', state);
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false });
  };

  const changeState = (state: EventStateFilter) => {
    window.localStorage.setItem(EVENT_STATE_PREFERENCE_KEY, state);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${EVENT_STATE_PREFERENCE_COOKIE}=${eventStateFilterToCookie(state)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    navigate(state);
  };

  return (
    <label className="event-state-selector">
      <span>Eventos em:</span>
      <select aria-label="Filtrar eventos por estado" value={selected}
        onChange={event => changeState(event.target.value as EventStateFilter)}>
        <option value="ALL">Todos</option>
        {SUPPORTED_EVENT_STATES.map(state => <option key={state} value={state}>{state}</option>)}
      </select>
    </label>
  );
}
