import { OrganizationInvitationRole, OrganizationInvitationStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrganizationInvitationDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(320)
  email!: string;

  @IsEnum(OrganizationInvitationRole, { message: 'O cargo deve ser PRODUCER ou STAFF' })
  role!: OrganizationInvitationRole;

  @IsOptional()
  @IsString()
  @MaxLength(250, { message: 'A mensagem personalizada deve ter no máximo 250 caracteres' })
  customMessage?: string;
}

export class UpdateOrganizationInvitationRoleDto {
  @IsEnum(OrganizationInvitationRole, { message: 'O cargo deve ser PRODUCER ou STAFF' })
  role!: OrganizationInvitationRole;
}

export class ListOrganizationInvitationsDto {
  @IsOptional()
  @IsEnum(OrganizationInvitationStatus)
  status?: OrganizationInvitationStatus;
}

export class AcceptOrganizationInvitationDto {
  @IsString()
  @MaxLength(500)
  token!: string;
}
