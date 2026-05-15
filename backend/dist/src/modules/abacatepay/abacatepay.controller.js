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
exports.AbacatepayController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const abacatepay_service_1 = require("./abacatepay.service");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const throttler_1 = require("@nestjs/throttler");
let AbacatepayController = class AbacatepayController {
    constructor(abacatepay) {
        this.abacatepay = abacatepay;
    }
    createPix(orderId, user) {
        if (!orderId)
            throw new common_1.BadRequestException('orderId obrigatório');
        return this.abacatepay.createPixCharge(orderId, user.id);
    }
    checkPix(pixId, orderId, user) {
        if (!pixId || !orderId)
            throw new common_1.BadRequestException('pixId e orderId obrigatórios');
        return this.abacatepay.checkPixAndConfirm(pixId, orderId, user.id);
    }
    simulatePix(pixId, _user) {
        if (!pixId)
            throw new common_1.BadRequestException('pixId obrigatório');
        return this.abacatepay.simulatePixPayment(pixId);
    }
    async abacatepayWebhook(body, secret) {
        await this.abacatepay.handleWebhook(body, secret ?? '');
        return { received: true };
    }
};
exports.AbacatepayController = AbacatepayController;
__decorate([
    (0, common_1.Post)('pix/create'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Gera cobrança PIX via AbacatePay para um pedido pendente' }),
    __param(0, (0, common_1.Body)('orderId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AbacatepayController.prototype, "createPix", null);
__decorate([
    (0, common_1.Post)('pix/check'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Consulta status do PIX no AbacatePay e confirma pedido se pago' }),
    __param(0, (0, common_1.Body)('pixId')),
    __param(1, (0, common_1.Body)('orderId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AbacatepayController.prototype, "checkPix", null);
__decorate([
    (0, common_1.Post)('pix/simulate'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Simula pagamento PIX em modo dev (AbacatePay sandbox)' }),
    __param(0, (0, common_1.Body)('pixId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AbacatepayController.prototype, "simulatePix", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, throttler_1.SkipThrottle)(),
    (0, common_1.Post)('webhook/abacatepay'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook AbacatePay (interno)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('secret')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AbacatepayController.prototype, "abacatepayWebhook", null);
exports.AbacatepayController = AbacatepayController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, common_1.Controller)({ path: 'payments', version: '1' }),
    __metadata("design:paramtypes", [abacatepay_service_1.AbacatepayService])
], AbacatepayController);
//# sourceMappingURL=abacatepay.controller.js.map