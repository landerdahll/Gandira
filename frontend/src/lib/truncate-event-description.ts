export const MOBILE_EVENT_DESCRIPTION_LIMIT = 500;
export const MOBILE_EVENT_DESCRIPTION_TOLERANCE = 40;

export type TruncatedEventDescription = {
  text: string;
  truncated: boolean;
};

/**
 * Creates a readable plain-text preview without splitting a word. Event
 * descriptions are rendered by React as text (never as raw HTML), so markup-like
 * input remains escaped and cannot become broken or executable HTML.
 */
export function truncateEventDescription(
  description: string,
  limit = MOBILE_EVENT_DESCRIPTION_LIMIT,
  tolerance = MOBILE_EVENT_DESCRIPTION_TOLERANCE,
): TruncatedEventDescription {
  const text = description.trim();
  if (text.length <= limit) return { text, truncated: false };

  const maximum = Math.min(text.length, limit + tolerance);
  const forwardWhitespace = text.slice(limit, maximum + 1).search(/\s/);
  let cutAt = forwardWhitespace >= 0 ? limit + forwardWhitespace : -1;

  if (cutAt < 0) {
    const backwardWhitespace = text.slice(0, limit + 1).search(/\s+\S*$/);
    cutAt = backwardWhitespace >= 0 ? backwardWhitespace : limit;
  }

  const preview = text.slice(0, cutAt).trimEnd().replace(/[,:;\-–—]+$/, '');
  return { text: `${preview}…`, truncated: true };
}
