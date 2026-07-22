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
exports.ClubMembersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const club_members_service_1 = require("./club-members.service");
const create_club_member_dto_1 = require("./dto/create-club-member.dto");
const update_club_discount_dto_1 = require("./dto/update-club-discount.dto");
let ClubMembersController = class ClubMembersController {
    constructor(clubMembers) {
        this.clubMembers = clubMembers;
    }
    list(page, limit, search) {
        return this.clubMembers.list(page, limit, search);
    }
    create(dto, admin) {
        return this.clubMembers.create(dto, admin.id);
    }
    findOne(id) {
        return this.clubMembers.findOne(id);
    }
    activate(id, admin) {
        return this.clubMembers.activate(id, admin.id);
    }
    deactivate(id, admin) {
        return this.clubMembers.deactivate(id, admin.id);
    }
    updateDiscount(id, dto, admin) {
        return this.clubMembers.updateDiscount(id, dto.discountPercentage, admin.id);
    }
};
exports.ClubMembersController = ClubMembersController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar e pesquisar membros do Clube Outrahora' }),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String]),
    __metadata("design:returntype", void 0)
], ClubMembersController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cadastrar membro no Clube Outrahora' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_club_member_dto_1.CreateClubMemberDto, Object]),
    __metadata("design:returntype", void 0)
], ClubMembersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Consultar membro do Clube Outrahora' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ClubMembersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, swagger_1.ApiOperation)({ summary: 'Ativar membro do Clube Outrahora' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ClubMembersController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, swagger_1.ApiOperation)({ summary: 'Desativar membro do Clube Outrahora' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ClubMembersController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Patch)(':id/discount-percentage'),
    (0, swagger_1.ApiOperation)({ summary: 'Alterar percentual de desconto do membro' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_club_discount_dto_1.UpdateClubDiscountDto, Object]),
    __metadata("design:returntype", void 0)
], ClubMembersController.prototype, "updateDiscount", null);
exports.ClubMembersController = ClubMembersController = __decorate([
    (0, swagger_1.ApiTags)('Clube Outrahora'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Controller)({ path: 'admin/club-members', version: '1' }),
    __metadata("design:paramtypes", [club_members_service_1.ClubMembersService])
], ClubMembersController);
//# sourceMappingURL=club-members.controller.js.map