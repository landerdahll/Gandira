'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, History, Users } from 'lucide-react';
import { useOrganization } from '@/lib/organization-context';

export function OrganizationNavigation() {
  const pathname = usePathname();
  const { active: currentOrganization, organizations, canViewMembers, canViewTransfers, selectOrganization } = useOrganization();
  const links = [
    { href: '/organization', label: 'Organização', icon: Building2, show: true },
    { href: '/organization/members', label: 'Equipe', icon: Users, show: canViewMembers },
    { href: '/organization/transfers', label: 'Transferências', icon: History, show: canViewTransfers },
  ];
  return <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28 }}>
    {links.filter((item) => item.show).map(({ href, label, icon: Icon }) => {
      const active = pathname === href;
      return <Link key={href} href={href} style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 10,
        textDecoration: 'none', color: active ? '#67bed9' : 'var(--theme-muted)',
        background: active ? 'rgba(103,190,217,.12)' : 'var(--theme-surface)',
        border: `1px solid ${active ? 'rgba(103,190,217,.35)' : 'var(--theme-border)'}`,
      }}><Icon size={15}/>{label}</Link>;
    })}
    {organizations.length > 1 && <select aria-label="Organização ativa" value={currentOrganization?.organization.id || ''} onChange={event => selectOrganization(event.target.value)} style={{ marginLeft: 'auto', padding: '9px 12px', borderRadius: 10, border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text)' }}>{organizations.map(item => <option key={item.organization.id} value={item.organization.id}>{item.organization.name}</option>)}</select>}
  </nav>;
}
