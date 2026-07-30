import { OrganizationMemberStatus, OrganizationRole } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class ListOrganizationMembersDto {
  @IsOptional() @IsInt() @Min(1) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsEnum(OrganizationRole) role?: OrganizationRole;
  @IsOptional() @IsEnum(OrganizationMemberStatus) status?: OrganizationMemberStatus;
}

export class UpdateOrganizationMemberRoleDto {
  @IsEnum(OrganizationRole) role: OrganizationRole;
}

export class UpdateOrganizationMemberStatusDto {
  @IsEnum(OrganizationMemberStatus) status: OrganizationMemberStatus;
}
