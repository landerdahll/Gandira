'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, History, Users } from 'lucide-react';
import { useOrganization } from '@/lib/organization-context';

export function OrganizationNavigation() {
  const pathname = usePathname();
  const { canViewMembers, canViewTransfers } = useOrganization();
  const links = [
    { href: '/organization', label: 'Organização', icon: Building2, show: true },
    { href: '/organization/members', label: 'Equipe', icon: Users, show: canViewMembers },
    { href: '/organization/transfers', label: 'Transferências', icon: History, show: canViewTransfers },
  ];
  return <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
    {links.filter((item) => item.show).map(({ href, label, icon: Icon }) => {
      const active = pathname === href;
      return <Link key={href} href={href} style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 10,
        textDecoration: 'none', color: active ? '#67bed9' : 'var(--theme-muted)',
        background: active ? 'rgba(103,190,217,.12)' : 'var(--theme-surface)',
        border: `1px solid ${active ? 'rgba(103,190,217,.35)' : 'var(--theme-border)'}`,
      }}><Icon size={15}/>{label}</Link>;
    })}
  </nav>;
}
