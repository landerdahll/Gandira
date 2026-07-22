import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class UpdateClubDiscountDto {
  @ApiProperty({ example: '12.50', description: 'Percentual entre 0,01 e 99,99' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(/^\d{1,2}(?:\.\d{1,2})?$/, {
    message: 'O percentual de desconto deve ser um decimal entre 0,01 e 99,99, com até duas casas decimais',
  })
  discountPercentage: string;
}
