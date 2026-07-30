import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationAccessService } from './organization-access.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationMembersService } from './organization-members.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationAccessService, OrganizationMembersService],
  exports: [OrganizationsService, OrganizationAccessService],
})
export class OrganizationsModule {}
