import { IsBoolean, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Use somente letras minúsculas, números e hífens no slug' }) slug?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) logoUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) website?: string;
  @IsOptional() @IsString() @MaxLength(100) instagram?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateOrganizationDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Use somente letras minúsculas, números e hífens no slug' }) slug?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) logoUrl?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) website?: string;
  @IsOptional() @IsString() @MaxLength(100) instagram?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
