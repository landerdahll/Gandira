'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { organizationsApi } from './api';
import { useAuth } from './auth-context';

export type OrganizationRole = 'ORG_ADMIN' | 'PRODUCER' | 'STAFF';
export interface ActiveOrganizationContext {
  organizationMemberId: string | null;
  organizationRole: OrganizationRole | null;
  organization: {
    id: string; name: string; slug: string; logoUrl?: string | null;
    primaryColor?: string | null; secondaryColor?: string | null;
    website?: string | null; instagram?: string | null;
  };
}

interface OrganizationContextValue {
  active: ActiveOrganizationContext | null;
  organizations: ActiveOrganizationContext[];
  loading: boolean;
  selectionRequired: boolean;
  isSuperAdmin: boolean;
  canViewMembers: boolean;
  canManageMembers: boolean;
  canManageInvitations: boolean;
  canViewTransfers: boolean;
  canManageEvents: boolean;
  canCheckIn: boolean;
  refresh: () => Promise<void>;
  selectOrganization: (organizationId: string) => boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [active, setActive] = useState<ActiveOrganizationContext | null>(null);
  const [options, setOptions] = useState<ActiveOrganizationContext[]>([]);
  const [selectionRequired, setSelectionRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { setActive(null); setOptions([]); setSelectionRequired(false); localStorage.removeItem('pago-active-organization-id'); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await organizationsApi.context();
      const nextOptions = (data.organizations || []).map((item: any) => item.organization ? item : {
        organizationMemberId: null, organizationRole: null, organization: item,
      });
      const savedId = localStorage.getItem('pago-active-organization-id');
      const saved = nextOptions.find((item: ActiveOrganizationContext) => item.organization.id === savedId);
      const nextActive = data.active || saved || null;
      if (savedId && !saved) localStorage.removeItem('pago-active-organization-id');
      if (nextActive) localStorage.setItem('pago-active-organization-id', nextActive.organization.id);
      setActive(nextActive);
      setOptions(nextOptions);
      setSelectionRequired(!nextActive && nextOptions.length > 0);
    } catch {
      setActive(null);
      setSelectionRequired(false);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, user?.id]);

  const role = active?.organizationRole;
  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN';
  const selectOrganization = (organizationId: string) => {
    const selected = options.find(option => option.organization.id === organizationId);
    if (!selected) return false;
    setActive(selected);
    setSelectionRequired(false);
    localStorage.setItem('pago-active-organization-id', organizationId);
    return true;
  };
  return <OrganizationContext.Provider value={{
    active, organizations: options, loading: authLoading || loading, selectionRequired, isSuperAdmin,
    canViewMembers: isSuperAdmin || role === 'ORG_ADMIN' || role === 'PRODUCER',
    canManageMembers: isSuperAdmin || role === 'ORG_ADMIN',
    canManageInvitations: isSuperAdmin || role === 'ORG_ADMIN',
    canViewTransfers: isSuperAdmin || role === 'ORG_ADMIN' || role === 'PRODUCER',
    canManageEvents: isSuperAdmin || role === 'ORG_ADMIN' || role === 'PRODUCER',
    canCheckIn: isSuperAdmin || role === 'ORG_ADMIN' || role === 'PRODUCER' || role === 'STAFF',
    refresh, selectOrganization,
  }}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used inside OrganizationProvider');
  return context;
}
