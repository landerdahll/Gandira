export type OrganizationRoleName = 'ORG_ADMIN' | 'PRODUCER' | 'STAFF';

export type OrganizationActor = {
  id: string;
  platformRole?: 'MEMBER' | 'SUPER_ADMIN' | string;
};

/**
 * The organization selection is intentionally transport-agnostic. A future
 * adapter may populate it from a route, session, header or organization picker.
 */
export type OrganizationSelection = {
  organizationId?: string | null;
};

export type OrganizationAccessContext = {
  userId: string;
  platformRole: 'MEMBER' | 'SUPER_ADMIN';
  organizationId: string | null;
  organizationMemberId: string | null;
  organizationRole: OrganizationRoleName | null;
  isSuperAdmin: boolean;
};
