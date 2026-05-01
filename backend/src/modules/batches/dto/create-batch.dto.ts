import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
  MaxLength,
  Max,
} from 'class-validator';
import { TicketType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBatchDto {
  @ApiProperty({ example: '1º Lote' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Acesso pista' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 89.9 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity: number;

  @ApiProperty({ example: '2025-06-01T00:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2025-08-14T23:59:59Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ enum: TicketType, default: TicketType.GENERAL })
  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
