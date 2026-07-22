import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional({ example: '10.00', default: '10.00', description: 'Percentual entre 0,01 e 99,99' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/^\d{1,2}(?:\.\d{1,2})?$/, {
    message: 'O percentual de desconto deve ser um decimal entre 0,01 e 99,99, com até duas casas decimais',
  })
  discountPercentage?: string;
}
