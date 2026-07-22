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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateClubDiscountDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class UpdateClubDiscountDto {
}
exports.UpdateClubDiscountDto = UpdateClubDiscountDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '12.50', description: 'Percentual entre 0,01 e 99,99' }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{1,2}(?:\.\d{1,2})?$/, {
        message: 'O percentual de desconto deve ser um decimal entre 0,01 e 99,99, com até duas casas decimais',
    }),
    __metadata("design:type", String)
], UpdateClubDiscountDto.prototype, "discountPercentage", void 0);
//# sourceMappingURL=update-club-discount.dto.js.map