'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrganization } from '@/lib/organization-context';
import { OrganizationNavigation } from '@/components/organization/organization-navigation';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { active, loading, selectionRequired } = useOrganization();
  useEffect(() => {
    if (!authLoading && !loading && !user) router.push('/auth/login');
  }, [authLoading, loading, user, router]);
  if (authLoading || loading) return <div className="min-h-screen grid place-items-center"><div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#67bed9', borderTopColor: 'transparent' }}/></div>;
  if (!user) return null;
  if (selectionRequired || !active) return <div style={{ maxWidth: 760, margin: '60px auto', padding: 24 }}>
    <h1 style={{ fontSize: 24, fontWeight: 750 }}>Contexto de organização necessário</h1>
    <p style={{ color: 'var(--theme-muted)', marginTop: 10 }}>Sua conta possui acesso a mais de uma organização. O seletor completo será disponibilizado em uma fase futura; nenhuma organização foi escolhida automaticamente.</p>
  </div>;
  return <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 20px 80px' }}><OrganizationNavigation/>{children}</div>;
}
