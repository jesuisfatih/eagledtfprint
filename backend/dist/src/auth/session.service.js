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
var SessionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../redis/redis.service");
let SessionService = SessionService_1 = class SessionService {
    redisService;
    logger = new common_1.Logger(SessionService_1.name);
    SESSION_PREFIX = 'session:';
    SESSION_TTL = 7 * 24 * 60 * 60;
    constructor(redisService) {
        this.redisService = redisService;
    }
    get redis() {
        return this.redisService.getClient();
    }
    async createSession(userId, data) {
        const sessionId = this.generateSessionId();
        const key = this.SESSION_PREFIX + sessionId;
        await this.redis.setex(key, this.SESSION_TTL, JSON.stringify({
            userId,
            ...data,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
        }));
        this.logger.log(`Session created: ${sessionId} for user ${userId}`);
        return sessionId;
    }
    async getSession(sessionId) {
        const key = this.SESSION_PREFIX + sessionId;
        const data = await this.redis.get(key);
        if (!data) {
            return null;
        }
        return JSON.parse(data);
    }
    async updateActivity(sessionId) {
        const session = await this.getSession(sessionId);
        if (session) {
            session.lastActivity = new Date().toISOString();
            const key = this.SESSION_PREFIX + sessionId;
            await this.redis.setex(key, this.SESSION_TTL, JSON.stringify(session));
        }
    }
    async deleteSession(sessionId) {
        const key = this.SESSION_PREFIX + sessionId;
        await this.redis.del(key);
        this.logger.log(`Session deleted: ${sessionId}`);
    }
    async getUserSessions(userId) {
        const keys = await this.redis.keys(this.SESSION_PREFIX + '*');
        const sessions = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const session = JSON.parse(data);
                if (session.userId === userId) {
                    sessions.push({
                        sessionId: key.replace(this.SESSION_PREFIX, ''),
                        ...session,
                    });
                }
            }
        }
        return sessions;
    }
    async getAllSessions() {
        const keys = await this.redis.keys(this.SESSION_PREFIX + '*');
        const sessions = [];
        for (const key of keys) {
            const data = await this.redis.get(key);
            if (data) {
                const session = JSON.parse(data);
                sessions.push({
                    sessionId: key.replace(this.SESSION_PREFIX, ''),
                    ...session,
                });
            }
        }
        return sessions.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    }
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = SessionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], SessionService);
//# sourceMappingURL=session.service.js.map