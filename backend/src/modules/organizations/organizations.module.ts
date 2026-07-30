import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationAccessService } from './organization-access.service';

@Module({
  providers: [OrganizationsService, OrganizationAccessService],
  exports: [OrganizationsService, OrganizationAccessService],
})
export class OrganizationsModule {}
