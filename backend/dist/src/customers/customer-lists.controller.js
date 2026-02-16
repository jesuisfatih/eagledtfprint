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
exports.CustomerListsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const customer_lists_service_1 = require("./customer-lists.service");
let CustomerListsController = class CustomerListsController {
    listsService;
    constructor(listsService) {
        this.listsService = listsService;
    }
    async findAll(merchantId) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.listsService.findAllLists(merchantId);
    }
    async getAlarmSummary(merchantId) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.listsService.getAlarmSummary(merchantId);
    }
    async generateAlarms(merchantId) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.listsService.generateSmartAlarms(merchantId);
    }
    async createList(merchantId, body) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        if (!body.name)
            throw new common_1.BadRequestException('List name required');
        return this.listsService.createList(merchantId, body);
    }
    async getList(merchantId, id) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.listsService.getListWithCustomers(id, merchantId);
    }
    async updateList(merchantId, id, body) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.listsService.updateList(id, merchantId, body);
    }
    async deleteList(merchantId, id) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.listsService.deleteList(id, merchantId);
    }
    async addCustomers(merchantId, id, body) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        if (!body.customerIds?.length)
            throw new common_1.BadRequestException('Customer IDs required');
        return this.listsService.addCustomersToList(id, merchantId, body.customerIds, body.notes);
    }
    async removeCustomers(merchantId, id, body) {
        if (!merchantId)
            throw new common_1.BadRequestException('Merchant ID required');
        return this.listsService.removeCustomersFromList(id, merchantId, body.customerIds);
    }
    async updateItemNote(itemId, notes) {
        return this.listsService.updateItemNote(itemId, notes);
    }
};
exports.CustomerListsController = CustomerListsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('alarms/summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "getAlarmSummary", null);
__decorate([
    (0, common_1.Post)('alarms/generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "generateAlarms", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "createList", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "getList", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "updateList", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "deleteList", null);
__decorate([
    (0, common_1.Post)(':id/customers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "addCustomers", null);
__decorate([
    (0, common_1.Delete)(':id/customers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "removeCustomers", null);
__decorate([
    (0, common_1.Patch)('items/:itemId/note'),
    __param(0, (0, common_1.Param)('itemId')),
    __param(1, (0, common_1.Body)('notes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustomerListsController.prototype, "updateItemNote", null);
exports.CustomerListsController = CustomerListsController = __decorate([
    (0, common_1.Controller)('customer-lists'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [customer_lists_service_1.CustomerListsService])
], CustomerListsController);
//# sourceMappingURL=customer-lists.controller.js.map