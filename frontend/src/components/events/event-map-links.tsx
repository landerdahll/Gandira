'use client';

import { ExternalLink, MapPin } from 'lucide-react';

export function EventMapLinks({ query }: { query: string }) {
  const encodedQuery = encodeURIComponent(query);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  function openRoute(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isAndroid && !isIOS) return;
    event.preventDefault();
    const nativeUrl = isAndroid
      ? `geo:0,0?q=${encodedQuery}`
      : `https://maps.apple.com/?q=${encodedQuery}`;
    window.location.assign(nativeUrl);
  }

  return (
    <div className="event-map-actions">
      <a className="event-map-button" href={googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={openRoute}>
        <MapPin size={16} /> Ver rota <ExternalLink size={13} />
      </a>
    </div>
  );
}
