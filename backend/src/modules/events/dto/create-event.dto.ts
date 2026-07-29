import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  IsUrl,
  IsBoolean,
  Matches,
  ValidateIf,
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

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsUrl()
  bannerImage?: string;

  @ApiPropertyOptional({
    description: 'Link de playlist, álbum, artista ou música no Spotify',
    example: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:playlist|album|artist|track)\/[A-Za-z0-9]+(?:[/?#].*)?$/i, {
    message: 'spotifyUrl deve ser um link de playlist, álbum, artista ou música do Spotify',
  })
  spotifyUrl?: string;

  @ApiPropertyOptional({
    description: 'Link do perfil oficial do artista ou da banda no Instagram',
    example: 'https://www.instagram.com/artista',
  })
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?(?:[?#].*)?$/i, {
    message: 'instagramUrl deve ser um link HTTPS de perfil do Instagram',
  })
  instagramUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowTicketTransfers?: boolean;
}
