import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClubMemberDto {
  @ApiProperty({ example: '529.982.247-25' })
  @IsString()
  @MinLength(11)
  @MaxLength(14)
  cpf: string;

  @ApiPropertyOptional({ example: 'Maria da Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'maria@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ example: '(48) 99999-9999' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
