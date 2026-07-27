import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.css';

const themeInitScript = `
  try {
    var theme = localStorage.getItem('pago-theme') === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  }
`;

export const metadata: Metadata = {
  title: { default: 'Pago', template: '%s | Pago' },
  description: 'Ingressos para os melhores eventos',
  icons: {
    icon: [{ url: '/favicon-pago-black.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon-pago-black.svg',
  },
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Pago' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <Navbar />
              <main className="min-h-screen">{children}</main>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  className: 'theme-toast',
                  style: {
                    background: 'var(--theme-surface)',
                    color: 'var(--theme-text)',
                    border: '1px solid var(--theme-border)',
                    borderRadius: '12px',
                    fontSize: '14px',
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
