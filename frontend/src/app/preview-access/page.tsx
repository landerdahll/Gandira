import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Área em desenvolvimento',
  robots: { index: false, follow: false, noarchive: true },
};

function safeDestination(value?: string) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function PreviewAccessPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'grid', placeItems: 'center', padding: '24px',
      background: '#0a0a0a', color: '#fff',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>
          Área em desenvolvimento
        </h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
          Digite a senha para acessar o Pago.
        </p>

        <form action="/api/preview-access" method="post" style={{ display: 'grid', gap: '12px' }}>
          <input type="hidden" name="next" value={safeDestination(searchParams.next)} />
          <label htmlFor="preview-password" style={{ fontSize: '13px', fontWeight: 600, color: '#aaa' }}>
            Senha
          </label>
          <input
            id="preview-password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px', borderRadius: '10px',
              border: '1px solid #2a2a2a', background: '#141414',
              color: '#fff', fontSize: '15px', outline: 'none',
            }}
          />
          {searchParams.error === 'invalid' && (
            <p role="alert" style={{ color: '#ff6b6b', fontSize: '13px' }}>Senha incorreta</p>
          )}
          <button type="submit" style={{
            marginTop: '4px', padding: '12px 16px', border: 0,
            borderRadius: '10px', background: '#67bed9', color: '#fff',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          }}>
            Acessar
          </button>
        </form>
      </div>
    </div>
  );
}
