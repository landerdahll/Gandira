"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbacatepayModule = void 0;
const common_1 = require("@nestjs/common");
const abacatepay_service_1 = require("./abacatepay.service");
const abacatepay_controller_1 = require("./abacatepay.controller");
const tickets_module_1 = require("../tickets/tickets.module");
const mail_module_1 = require("../mail/mail.module");
let AbacatepayModule = class AbacatepayModule {
};
exports.AbacatepayModule = AbacatepayModule;
exports.AbacatepayModule = AbacatepayModule = __decorate([
    (0, common_1.Module)({
        imports: [tickets_module_1.TicketsModule, mail_module_1.MailModule],
        controllers: [abacatepay_controller_1.AbacatepayController],
        providers: [abacatepay_service_1.AbacatepayService],
    })
], AbacatepayModule);
//# sourceMappingURL=abacatepay.module.js.map