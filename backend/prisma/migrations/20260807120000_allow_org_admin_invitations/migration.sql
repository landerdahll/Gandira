-- Allow SUPER_ADMIN to invite the first administrator of an organization.
ALTER TYPE "OrganizationInvitationRole" ADD VALUE 'ORG_ADMIN' BEFORE 'PRODUCER';
