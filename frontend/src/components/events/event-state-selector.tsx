'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  EVENT_STATE_PREFERENCE_KEY,
  EventStateFilter,
  SUPPORTED_EVENT_STATES,
  isSupportedEventState,
  normalizeEventStateFilter,
} from '@/lib/event-states';

export function EventStateSelector({ selected }: { selected: EventStateFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const navigate = (state: EventStateFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (state === 'ALL') params.delete('state');
    else params.set('state', state);
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false });
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = window.localStorage.getItem(EVENT_STATE_PREFERENCE_KEY);
    if (saved === 'ALL' || isSupportedEventState(saved)) {
      const preferred = normalizeEventStateFilter(saved);
      if (preferred !== selected) navigate(preferred);
      return;
    }

    const controller = new AbortController();
    fetch('/api/location/state', { signal: controller.signal })
      .then(response => response.ok ? response.json() : { state: 'ALL' })
      .then(({ state }) => {
        const detected = normalizeEventStateFilter(state);
        if (detected !== selected) navigate(detected);
      })
      .catch(() => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeState = (state: EventStateFilter) => {
    window.localStorage.setItem(EVENT_STATE_PREFERENCE_KEY, state);
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
