import { RedisService } from '../redis/redis.service';
export declare class TokenBlacklistService {
    private readonly redisService;
    private readonly logger;
    private readonly BLACKLIST_PREFIX;
    private readonly TTL;
    constructor(redisService: RedisService);
    private get redis();
    addToBlacklist(token: string, reason?: string): Promise<void>;
    isBlacklisted(token: string): Promise<boolean>;
    removeFromBlacklist(token: string): Promise<void>;
    getBlacklistedCount(): Promise<number>;
}
