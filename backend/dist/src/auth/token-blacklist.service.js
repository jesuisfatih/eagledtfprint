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
var TokenBlacklistService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBlacklistService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let TokenBlacklistService = TokenBlacklistService_1 = class TokenBlacklistService {
    redisService;
    logger = new common_1.Logger(TokenBlacklistService_1.name);
    BLACKLIST_PREFIX = 'token:blacklist:';
    TTL = 7 * 24 * 60 * 60;
    constructor(redisService) {
        this.redisService = redisService;
    }
    get redis() {
        return this.redisService.getClient();
    }
    async addToBlacklist(token, reason = 'logout') {
        const key = this.BLACKLIST_PREFIX + token;
        await this.redis.setex(key, this.TTL, JSON.stringify({
            reason,
            blacklistedAt: new Date().toISOString(),
        }));
        this.logger.log(`Token blacklisted: ${reason}`);
    }
    async isBlacklisted(token) {
        const key = this.BLACKLIST_PREFIX + token;
        const exists = await this.redis.exists(key);
        return exists === 1;
    }
    async removeFromBlacklist(token) {
        const key = this.BLACKLIST_PREFIX + token;
        await this.redis.del(key);
    }
    async getBlacklistedCount() {
        const keys = await this.redis.keys(this.BLACKLIST_PREFIX + '*');
        return keys.length;
    }
};
exports.TokenBlacklistService = TokenBlacklistService;
exports.TokenBlacklistService = TokenBlacklistService = TokenBlacklistService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], TokenBlacklistService);
//# sourceMappingURL=token-blacklist.service.js.map