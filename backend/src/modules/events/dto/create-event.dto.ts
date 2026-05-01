import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  venue: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  address: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2)
  state: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({ example: '2025-08-15T20:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-08-16T02:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: '2025-08-15T19:00:00Z' })
  @IsOptional()
  @IsDateString()
  doorsOpen?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsInt()
  @Min(0)
  ageRating?: number;

  @ApiPropertyOptional({ example: 'Shows' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: ['eletrônico', 'festa'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  coverImage?: string;
}
