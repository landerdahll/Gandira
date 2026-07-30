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
  loading: boolean;
  selectionRequired: boolean;
  isSuperAdmin: boolean;
  canViewMembers: boolean;
  canManageMembers: boolean;
  canViewTransfers: boolean;
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [active, setActive] = useState<ActiveOrganizationContext | null>(null);
  const [selectionRequired, setSelectionRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { setActive(null); setSelectionRequired(false); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await organizationsApi.context();
      setActive(data.active);
      setSelectionRequired(data.selectionRequired);
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
  return <OrganizationContext.Provider value={{
    active, loading: authLoading || loading, selectionRequired, isSuperAdmin,
    canViewMembers: isSuperAdmin || role === 'ORG_ADMIN' || role === 'PRODUCER',
    canManageMembers: isSuperAdmin || role === 'ORG_ADMIN',
    canViewTransfers: isSuperAdmin || role === 'ORG_ADMIN' || role === 'PRODUCER',
    refresh,
  }}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used inside OrganizationProvider');
  return context;
}
