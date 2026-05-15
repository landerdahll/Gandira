"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponsPublicController = exports.CouponsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const coupons_service_1 = require("./coupons.service");
const create_coupon_dto_1 = require("./dto/create-coupon.dto");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
class ValidateCouponDto {
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateCouponDto.prototype, "eventId", void 0);
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateCouponDto.prototype, "code", void 0);
let CouponsController = class CouponsController {
    constructor(coupons) {
        this.coupons = coupons;
    }
    create(eventId, dto, user) {
        return this.coupons.create(eventId, user.id, dto);
    }
    list(eventId, user) {
        return this.coupons.list(eventId, user.id);
    }
    remove(eventId, couponId, user) {
        return this.coupons.remove(eventId, couponId, user.id);
    }
};
exports.CouponsController = CouponsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.PRODUCER, client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Criar cupom de desconto' }),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_coupon_dto_1.CreateCouponDto, Object]),
    __metadata("design:returntype", void 0)
], CouponsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.PRODUCER, client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar cupons do evento' }),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CouponsController.prototype, "list", null);
__decorate([
    (0, common_1.Delete)(':couponId'),
    (0, roles_decorator_1.Roles)(client_1.Role.PRODUCER, client_1.Role.ADMIN),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remover cupom' }),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('couponId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CouponsController.prototype, "remove", null);
exports.CouponsController = CouponsController = __decorate([
    (0, swagger_1.ApiTags)('Coupons'),
    (0, common_1.Controller)({ path: 'events/:eventId/coupons', version: '1' }),
    __metadata("design:paramtypes", [coupons_service_1.CouponsService])
], CouponsController);
let CouponsPublicController = class CouponsPublicController {
    constructor(coupons) {
        this.coupons = coupons;
    }
    validate(dto) {
        return this.coupons.validate(dto.eventId, dto.code);
    }
};
exports.CouponsPublicController = CouponsPublicController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('validate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Validar cupom de desconto' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ValidateCouponDto]),
    __metadata("design:returntype", void 0)
], CouponsPublicController.prototype, "validate", null);
exports.CouponsPublicController = CouponsPublicController = __decorate([
    (0, swagger_1.ApiTags)('Coupons'),
    (0, common_1.Controller)({ path: 'coupons', version: '1' }),
    __metadata("design:paramtypes", [coupons_service_1.CouponsService])
], CouponsPublicController);
//# sourceMappingURL=coupons.controller.js.map