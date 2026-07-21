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
exports.TicketTransfersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const request_transfer_dto_1 = require("./dto/request-transfer.dto");
const ticket_transfers_service_1 = require("./ticket-transfers.service");
let TicketTransfersController = class TicketTransfersController {
    constructor(service) {
        this.service = service;
    }
    request(ticketId, dto, user) {
        return this.service.request(ticketId, user.id, dto.recipientEmail);
    }
    status(ticketId, user) { return this.service.ticketStatus(ticketId, user.id); }
    cancel(id, user) { return this.service.cancel(id, user.id); }
    mine(user) { return this.service.mine(user.id); }
    adminList(query, page, limit) {
        return this.service.adminList({ ...query, page, limit, status: query.status });
    }
    adminDetail(id) { return this.service.adminDetail(id); }
};
exports.TicketTransfersController = TicketTransfersController;
__decorate([
    (0, common_1.Post)('tickets/:ticketId'),
    (0, swagger_1.ApiOperation)({ summary: 'Solicitar transferência de ingresso' }),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, request_transfer_dto_1.RequestTransferDto, Object]),
    __metadata("design:returntype", void 0)
], TicketTransfersController.prototype, "request", null);
__decorate([
    (0, common_1.Get)('tickets/:ticketId'),
    (0, swagger_1.ApiOperation)({ summary: 'Situação da transferência do próprio ingresso' }),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TicketTransfersController.prototype, "status", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancelar transferência pendente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], TicketTransfersController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar minhas transferências' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TicketTransfersController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)('admin/list'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Histórico administrativo de transferências' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", void 0)
], TicketTransfersController.prototype, "adminList", null);
__decorate([
    (0, common_1.Get)('admin/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Detalhes e linha do tempo da transferência' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TicketTransfersController.prototype, "adminDetail", null);
exports.TicketTransfersController = TicketTransfersController = __decorate([
    (0, swagger_1.ApiTags)('Ticket transfers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)({ path: 'ticket-transfers', version: '1' }),
    __metadata("design:paramtypes", [ticket_transfers_service_1.TicketTransfersService])
], TicketTransfersController);
//# sourceMappingURL=ticket-transfers.controller.js.map