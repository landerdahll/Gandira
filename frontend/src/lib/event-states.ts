export const SUPPORTED_EVENT_STATES = ['RS', 'SC', 'PR', 'SP', 'RJ'] as const;

export type SupportedEventState = (typeof SUPPORTED_EVENT_STATES)[number];
export type EventStateFilter = SupportedEventState | 'ALL';

export const EVENT_STATE_PREFERENCE_KEY = 'pago-event-state-preference';
export const EVENT_STATE_PREFERENCE_COOKIE = 'pago_event_state_preference';
export const ALL_EVENT_STATES_COOKIE_VALUE = 'TODOS';

export function isSupportedEventState(value: unknown): value is SupportedEventState {
  return typeof value === 'string'
    && SUPPORTED_EVENT_STATES.includes(value.toUpperCase() as SupportedEventState);
}

export function normalizeEventStateFilter(value: unknown): EventStateFilter {
  if (value === 'ALL') return 'ALL';
  return isSupportedEventState(value) ? value.toUpperCase() as SupportedEventState : 'ALL';
}

export function eventStateFilterFromCookie(value: unknown): EventStateFilter | null {
  if (value === ALL_EVENT_STATES_COOKIE_VALUE) return 'ALL';
  return typeof value === 'string' && SUPPORTED_EVENT_STATES.includes(value as SupportedEventState)
    ? value as SupportedEventState
    : null;
}

export function eventStateFilterToCookie(value: EventStateFilter) {
  return value === 'ALL' ? ALL_EVENT_STATES_COOKIE_VALUE : value;
}
