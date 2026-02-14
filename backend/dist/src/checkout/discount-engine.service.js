"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DiscountEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let DiscountEngineService = DiscountEngineService_1 = class DiscountEngineService {
    prisma;
    logger = new common_1.Logger(DiscountEngineService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateDiscountCode(merchantId, companyId, cartId, discountAmount) {
        const code = `EAGLE-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        await this.prisma.discountCode.create({
            data: {
                merchantId,
                companyId,
                cartId,
                code,
                discountType: 'fixed_amount',
                value: discountAmount,
                usageLimit: 1,
                isActive: true,
            },
        });
        this.logger.log(`Generated discount code: ${code} for cart ${cartId}`);
        return code;
    }
    async validateDiscountCode(code, merchantId) {
        const discount = await this.prisma.discountCode.findFirst({
            where: {
                merchantId,
                code,
                isActive: true,
            },
        });
        if (!discount) {
            return null;
        }
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            return null;
        }
        const now = new Date();
        if (discount.validFrom && discount.validFrom > now) {
            return null;
        }
        if (discount.validUntil && discount.validUntil < now) {
            return null;
        }
        return discount;
    }
    async markDiscountUsed(code) {
        return this.prisma.discountCode.updateMany({
            where: { code },
            data: {
                usedCount: { increment: 1 },
            },
        });
    }
};
exports.DiscountEngineService = DiscountEngineService;
exports.DiscountEngineService = DiscountEngineService = DiscountEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DiscountEngineService);
//# sourceMappingURL=discount-engine.service.js.map