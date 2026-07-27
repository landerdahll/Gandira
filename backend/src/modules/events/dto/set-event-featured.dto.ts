import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetEventFeaturedDto {
  @ApiProperty()
  @IsBoolean()
  featured: boolean;
}
