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
exports.SupportTicketsController = void 0;
const common_1 = require("@nestjs/common");
const support_tickets_service_1 = require("./support-tickets.service");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
const update_ticket_dto_1 = require("./dto/update-ticket.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let SupportTicketsController = class SupportTicketsController {
    supportTicketsService;
    constructor(supportTicketsService) {
        this.supportTicketsService = supportTicketsService;
    }
    async getTickets(userId, companyId, merchantId, role, queryUserId) {
        if (role === 'admin' || role === 'merchant_admin') {
            return this.supportTicketsService.getAllTickets(merchantId);
        }
        if (queryUserId) {
            return this.supportTicketsService.getTicketsByUser(queryUserId, merchantId);
        }
        return this.supportTicketsService.getTicketsByUser(userId, merchantId);
    }
    async createTicket(userId, companyId, merchantId, dto) {
        if (!userId) {
            throw new common_1.BadRequestException('User ID required');
        }
        return this.supportTicketsService.createTicket(userId, companyId, merchantId, dto);
    }
    async getTicket(id) {
        return this.supportTicketsService.getTicketById(id);
    }
    async updateTicket(id, dto) {
        return this.supportTicketsService.updateTicket(id, dto);
    }
    async addResponse(id, userId, role, message) {
        if (!message) {
            throw new common_1.BadRequestException('Message required');
        }
        const isAdmin = role === 'admin' || role === 'merchant_admin';
        const userName = isAdmin ? 'Support Staff' : 'Customer';
        return this.supportTicketsService.addResponse(id, userId, userName, message, isAdmin);
    }
    async getStats(merchantId) {
        return this.supportTicketsService.getTicketStats(merchantId);
    }
};
exports.SupportTicketsController = SupportTicketsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(4, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SupportTicketsController.prototype, "getTickets", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('companyId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, create_ticket_dto_1.CreateTicketDto]),
    __metadata("design:returntype", Promise)
], SupportTicketsController.prototype, "createTicket", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SupportTicketsController.prototype, "getTicket", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_ticket_dto_1.UpdateTicketDto]),
    __metadata("design:returntype", Promise)
], SupportTicketsController.prototype, "updateTicket", null);
__decorate([
    (0, common_1.Post)(':id/responses'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('sub')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(3, (0, common_1.Body)('message')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], SupportTicketsController.prototype, "addResponse", null);
__decorate([
    (0, common_1.Get)('stats/overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('merchantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SupportTicketsController.prototype, "getStats", null);
exports.SupportTicketsController = SupportTicketsController = __decorate([
    (0, common_1.Controller)('support-tickets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [support_tickets_service_1.SupportTicketsService])
], SupportTicketsController);
//# sourceMappingURL=support-tickets.controller.js.map