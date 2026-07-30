import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

class ValidateCouponDto {
  @ApiProperty() @IsString() eventId: string;
  @ApiProperty() @IsString() code: string;
}

@ApiTags('Coupons')
@Controller({ path: 'events/:eventId/coupons', version: '1' })
export class CouponsController {
  constructor(private coupons: CouponsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar cupom de desconto' })
  create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateCouponDto,
    @CurrentUser() user: any,
  ) {
    return this.coupons.create(eventId, user, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar cupons do evento' })
  list(@Param('eventId') eventId: string, @CurrentUser() user: any) {
    return this.coupons.list(eventId, user);
  }

  @Delete(':couponId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cupom' })
  remove(
    @Param('eventId') eventId: string,
    @Param('couponId') couponId: string,
    @CurrentUser() user: any,
  ) {
    return this.coupons.remove(eventId, couponId, user);
  }
}

@ApiTags('Coupons')
@Controller({ path: 'coupons', version: '1' })
export class CouponsPublicController {
  constructor(private coupons: CouponsService) {}

  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar cupom de desconto' })
  validate(@Body() dto: ValidateCouponDto) {
    return this.coupons.validate(dto.eventId, dto.code);
  }
}
