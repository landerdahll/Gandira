'use client';

import { ExternalLink, MapPin, Navigation } from 'lucide-react';

export function EventMapLinks({ query }: { query: string }) {
  const encodedQuery = encodeURIComponent(query);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  const wazeUrl = `https://www.waze.com/ul?q=${encodedQuery}&navigate=yes`;

  return (
    <div className="event-map-actions">
      <a className="event-map-button event-map-button--google" href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
        <MapPin size={16} /> Ver no mapa <ExternalLink size={13} />
      </a>
      <a className="event-map-button event-map-button--waze" href={wazeUrl} target="_blank" rel="noopener noreferrer">
        <Navigation size={16} /> Waze
      </a>
    </div>
  );
}
