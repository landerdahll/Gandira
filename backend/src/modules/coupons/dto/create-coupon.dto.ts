import { IsString, IsNumber, Min, Max, IsOptional, IsInt, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ example: 'VIP20' })
  @IsString()
  code: string;

  @ApiProperty({ example: 20, description: 'Percentual de desconto (0–100)' })
  @IsNumber()
  @Min(1)
  @Max(100)
  discount: number;

  @ApiProperty({ required: false, example: 50, description: 'Limite de usos (nulo = ilimitado)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiProperty({ required: false, description: 'Data de expiração (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
