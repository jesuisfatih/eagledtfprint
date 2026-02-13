import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly BLACKLIST_PREFIX = 'token:blacklist:';
  private readonly TTL = 7 * 24 * 60 * 60; // 7 days

  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    return this.redisService.getClient();
  }

  async addToBlacklist(token: string, reason: string = 'logout'): Promise<void> {
    const key = this.BLACKLIST_PREFIX + token;
    
    await this.redis.setex(
      key,
      this.TTL,
      JSON.stringify({
        reason,
        blacklistedAt: new Date().toISOString(),
      })
    );

    this.logger.log(`Token blacklisted: ${reason}`);
  }

  async isBlacklisted(token: string): Promise<boolean> {
    const key = this.BLACKLIST_PREFIX + token;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async removeFromBlacklist(token: string): Promise<void> {
    const key = this.BLACKLIST_PREFIX + token;
    await this.redis.del(key);
  }

  async getBlacklistedCount(): Promise<number> {
    const keys = await this.redis.keys(this.BLACKLIST_PREFIX + '*');
    return keys.length;
  }
}

