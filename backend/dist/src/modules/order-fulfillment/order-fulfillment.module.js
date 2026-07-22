"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderFulfillmentModule = void 0;
const common_1 = require("@nestjs/common");
const tickets_module_1 = require("../tickets/tickets.module");
const order_expiration_service_1 = require("./order-expiration.service");
const order_fulfillment_service_1 = require("./order-fulfillment.service");
let OrderFulfillmentModule = class OrderFulfillmentModule {
};
exports.OrderFulfillmentModule = OrderFulfillmentModule;
exports.OrderFulfillmentModule = OrderFulfillmentModule = __decorate([
    (0, common_1.Module)({
        imports: [tickets_module_1.TicketsModule],
        providers: [order_expiration_service_1.OrderExpirationService, order_fulfillment_service_1.OrderFulfillmentService],
        exports: [order_expiration_service_1.OrderExpirationService, order_fulfillment_service_1.OrderFulfillmentService],
    })
], OrderFulfillmentModule);
//# sourceMappingURL=order-fulfillment.module.js.map