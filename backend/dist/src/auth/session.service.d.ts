import { RedisService } from '../redis/redis.service';
export declare class SessionService {
    private readonly redisService;
    private readonly logger;
    private readonly SESSION_PREFIX;
    private readonly SESSION_TTL;
    constructor(redisService: RedisService);
    private get redis();
    createSession(userId: string, data: any): Promise<string>;
    getSession(sessionId: string): Promise<any>;
    updateActivity(sessionId: string): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    getUserSessions(userId: string): Promise<any[]>;
    getAllSessions(): Promise<any[]>;
    private generateSessionId;
}
