const SPOTIFY_CONTENT_TYPES = new Set(['playlist', 'album', 'artist', 'track']);

export function getSpotifyEmbedUrl(spotifyUrl: string): string | null {
  try {
    const url = new URL(spotifyUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null;

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0]?.startsWith('intl-')) parts.shift();
    const [type, id, ...extra] = parts;
    if (!SPOTIFY_CONTENT_TYPES.has(type) || !/^[A-Za-z0-9]+$/.test(id ?? '') || extra.length > 0) return null;

    return `https://open.spotify.com/embed/${type}/${id}`;
  } catch {
    return null;
  }
}

export function SpotifyEmbed({ url }: { url: string }) {
  const embedUrl = getSpotifyEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <section aria-labelledby="spotify-heading" style={{ padding: '24px 0' }}>
      <h2 id="spotify-heading" style={{ color: '#fff', fontSize: '17px', fontWeight: 700, marginBottom: '12px' }}>
        Entre no clima 🎧
      </h2>
      <iframe
        title="Player do Spotify"
        src={embedUrl}
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        style={{ display: 'block', borderRadius: '12px', border: 0 }}
      />
    </section>
  );
}
