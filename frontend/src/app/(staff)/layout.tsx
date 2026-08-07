'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrganization } from '@/lib/organization-context';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { active, organizations, loading: organizationLoading, canCheckIn, selectOrganization } = useOrganization();
  const loading = authLoading || organizationLoading;
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    } else if (!loading && user && active && !canCheckIn) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#444', fontSize: 14 }}>Carregando...</div>
      </div>
    );
  }

  if (!user) return null;
  if (!active) return <div style={{ maxWidth: 620, margin: '60px auto', padding: 24 }}><h1>Selecione uma organização</h1><p style={{ color: 'var(--theme-muted)' }}>Escolha em qual organização fará o check-in.</p><div style={{ display: 'grid', gap: 10 }}>{organizations.filter(item => item.organizationRole === 'STAFF' || item.organizationRole === 'PRODUCER' || item.organizationRole === 'ORG_ADMIN' || user.platformRole === 'SUPER_ADMIN').map(item => <button key={item.organization.id} onClick={() => selectOrganization(item.organization.id)} style={{ padding: 16, textAlign: 'left', borderRadius: 12, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)' }}>{item.organization.name}</button>)}</div></div>;
  if (!canCheckIn) return null;

  return <>{children}</>;
}
