import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationAccessService } from './organization-access.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationMembersService } from './organization-members.service';
import { OrganizationInvitationsController } from './organization-invitations.controller';
import { OrganizationInvitationsService } from './organization-invitations.service';

@Module({
  controllers: [OrganizationsController, OrganizationInvitationsController],
  providers: [OrganizationsService, OrganizationAccessService, OrganizationMembersService, OrganizationInvitationsService],
  exports: [OrganizationsService, OrganizationAccessService],
})
export class OrganizationsModule {}
