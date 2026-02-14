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
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const webhook_auth_guard_1 = require("../common/guards/webhook-auth.guard");
const orders_handler_1 = require("./handlers/orders.handler");
const customers_handler_1 = require("./handlers/customers.handler");
let WebhooksController = class WebhooksController {
    ordersHandler;
    customersHandler;
    constructor(ordersHandler, customersHandler) {
        this.ordersHandler = ordersHandler;
        this.customersHandler = customersHandler;
    }
    async orderCreate(body, headers) {
        return this.ordersHandler.handleOrderCreate(body, headers);
    }
    async orderPaid(body, headers) {
        return this.ordersHandler.handleOrderPaid(body, headers);
    }
    async customerCreate(body, headers) {
        return this.customersHandler.handleCustomerCreate(body, headers);
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(webhook_auth_guard_1.WebhookAuthGuard),
    (0, common_1.Post)('orders/create'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "orderCreate", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(webhook_auth_guard_1.WebhookAuthGuard),
    (0, common_1.Post)('orders/paid'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "orderPaid", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(webhook_auth_guard_1.WebhookAuthGuard),
    (0, common_1.Post)('customers/create'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "customerCreate", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [orders_handler_1.OrdersHandler,
        customers_handler_1.CustomersHandler])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map