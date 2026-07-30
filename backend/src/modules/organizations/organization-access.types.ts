export type OrganizationRoleName = 'ORG_ADMIN' | 'PRODUCER' | 'STAFF';

export type OrganizationPermission =
  | 'ORGANIZATION_VIEW'
  | 'MEMBERS_VIEW'
  | 'MEMBERS_MANAGE'
  | 'TRANSFERS_VIEW'
  | 'EVENTS_MANAGE'
  | 'REPORTS_VIEW'
  | 'CHECK_IN_MANAGE'
  | 'SALES_VIEW';

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
