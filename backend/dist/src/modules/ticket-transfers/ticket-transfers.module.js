"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketTransfersModule = void 0;
const common_1 = require("@nestjs/common");
const ticket_transfers_controller_1 = require("./ticket-transfers.controller");
const ticket_transfers_service_1 = require("./ticket-transfers.service");
let TicketTransfersModule = class TicketTransfersModule {
};
exports.TicketTransfersModule = TicketTransfersModule;
exports.TicketTransfersModule = TicketTransfersModule = __decorate([
    (0, common_1.Module)({ controllers: [ticket_transfers_controller_1.TicketTransfersController], providers: [ticket_transfers_service_1.TicketTransfersService], exports: [ticket_transfers_service_1.TicketTransfersService] })
], TicketTransfersModule);
//# sourceMappingURL=ticket-transfers.module.js.map