import { Instagram } from 'lucide-react';

export function getInstagramProfileUrl(instagramUrl: string): string | null {
  try {
    const url = new URL(instagramUrl);
    if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname)) return null;

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 1 || !/^[A-Za-z0-9._]{1,30}$/.test(parts[0])) return null;

    return url.toString();
  } catch {
    return null;
  }
}

export function InstagramLink({ url }: { url: string }) {
  const profileUrl = getInstagramProfileUrl(url);
  if (!profileUrl) return null;

  return (
    <section aria-label="Instagram do artista" style={{ padding: '20px 0' }}>
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '9px 14px', borderRadius: '10px',
          background: '#141414', border: '1px solid #252525',
          color: '#aaa', fontSize: '13px', fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        <Instagram size={16} color="#67bed9" />
        Seguir no Instagram
      </a>
    </section>
  );
}
