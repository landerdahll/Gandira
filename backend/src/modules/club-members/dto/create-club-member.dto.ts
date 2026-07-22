import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClubMemberDto {
  @ApiProperty({ example: 'maria@example.com' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiPropertyOptional({ example: 'Maria da Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '(48) 99999-9999' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
