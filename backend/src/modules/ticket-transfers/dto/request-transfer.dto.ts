import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestTransferDto {
  @ApiProperty({ example: 'destinatario@email.com' })
  @IsEmail()
  recipientEmail: string;
}
