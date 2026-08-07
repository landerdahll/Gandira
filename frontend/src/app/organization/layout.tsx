'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrganization } from '@/lib/organization-context';
import { OrganizationNavigation } from '@/components/organization/organization-navigation';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { active, organizations, loading, selectionRequired, selectOrganization } = useOrganization();
  useEffect(() => {
    if (!authLoading && !loading && !user) router.push('/auth/login');
  }, [authLoading, loading, user, router]);
  if (authLoading || loading) return <div className="min-h-screen grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#67bed9', borderTopColor: 'transparent' }}/></div>;
  if (!user) return null;
  if (selectionRequired || !active) return <div style={{ maxWidth: 760, margin: '60px auto', padding: 24 }}>
    <h1 style={{ fontSize: 24, fontWeight: 750 }}>Selecione uma organização</h1>
    <p style={{ color: 'var(--theme-muted)', marginTop: 10 }}>Escolha explicitamente o contexto administrativo. Nenhuma organização será selecionada automaticamente.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 22 }}>{organizations.map(item => <button key={item.organization.id} onClick={() => selectOrganization(item.organization.id)} style={{ padding: 18, textAlign: 'left', border: '1px solid var(--theme-border)', borderRadius: 14, background: 'var(--theme-surface)', color: 'var(--theme-text)', cursor: 'pointer' }}><strong>{item.organization.name}</strong><small style={{ display: 'block', marginTop: 5, color: 'var(--theme-muted)' }}>{item.organizationRole === 'ORG_ADMIN' ? 'Administrador' : item.organizationRole === 'PRODUCER' ? 'Produtor' : item.organizationRole === 'STAFF' ? 'Staff' : 'Super administrador'}</small></button>)}</div>
  </div>;
  return <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 80px' }}><OrganizationNavigation/>{children}</div>;
}
