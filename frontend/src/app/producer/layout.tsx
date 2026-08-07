'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useOrganization } from '@/lib/organization-context';

export default function ProducerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { active, organizations, loading: organizationLoading, canManageEvents, selectOrganization } = useOrganization();
  const loading = authLoading || organizationLoading;
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
    else if (!loading && user && ((active && !canManageEvents) || organizations.length === 0)) router.push('/');
  }, [user, loading, active, organizations.length, canManageEvents, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#67bed9', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return null;
  if (!active) return <OrganizationPicker organizations={organizations} onSelect={selectOrganization} />;
  if (!canManageEvents) return <div style={{ maxWidth: 600, margin: '60px auto', padding: 24 }}>Seu cargo não permite gerenciar eventos.</div>;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
      {children}
    </div>
  );
}

function OrganizationPicker({ organizations, onSelect }: { organizations: any[]; onSelect: (id: string) => boolean }) {
  return <div style={{ maxWidth: 620, margin: '60px auto', padding: 24 }}><h1 style={{ fontSize: 24 }}>Selecione uma organização</h1><p style={{ color: 'var(--theme-muted)' }}>Escolha explicitamente qual organização deseja administrar.</p><div style={{ display: 'grid', gap: 10, marginTop: 20 }}>{organizations.map(item => <button key={item.organization.id} onClick={() => onSelect(item.organization.id)} style={{ padding: 16, textAlign: 'left', borderRadius: 12, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)', cursor: 'pointer' }}><strong>{item.organization.name}</strong><small style={{ display: 'block', color: 'var(--theme-muted)', marginTop: 4 }}>{item.organizationRole === 'ORG_ADMIN' ? 'Administrador' : item.organizationRole === 'PRODUCER' ? 'Produtor' : item.organizationRole === 'STAFF' ? 'Staff' : 'Super administrador'}</small></button>)}</div></div>;
}
