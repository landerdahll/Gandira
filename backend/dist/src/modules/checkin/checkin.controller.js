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
exports.CheckInController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const tickets_service_1 = require("../tickets/tickets.service");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const swagger_2 = require("@nestjs/swagger");
class ScanDto {
}
__decorate([
    (0, swagger_2.ApiProperty)({ description: 'Token extraído do QR Code' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScanDto.prototype, "token", void 0);
let CheckInController = class CheckInController {
    constructor(tickets) {
        this.tickets = tickets;
    }
    async scan(eventId, dto, user) {
        return this.tickets.validateAndCheckIn(dto.token, eventId, user.id);
    }
};
exports.CheckInController = CheckInController;
__decorate([
    (0, common_1.Post)('scan'),
    (0, roles_decorator_1.Roles)(client_1.Role.STAFF, client_1.Role.PRODUCER, client_1.Role.ADMIN),
    (0, throttler_1.Throttle)({ default: { ttl: 1000, limit: 5 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Escanear QR Code e registrar entrada' }),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ScanDto, Object]),
    __metadata("design:returntype", Promise)
], CheckInController.prototype, "scan", null);
exports.CheckInController = CheckInController = __decorate([
    (0, swagger_1.ApiTags)('Check-in'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: 'events/:eventId/checkin', version: '1' }),
    __metadata("design:paramtypes", [tickets_service_1.TicketsService])
], CheckInController);
//# sourceMappingURL=checkin.controller.js.map