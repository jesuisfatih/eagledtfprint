import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SESSION_PREFIX = 'session:';
  private readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days (Safari-proof)

  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    return this.redisService.getClient();
  }

  async createSession(userId: string, data: any): Promise<string> {
    const sessionId = this.generateSessionId();
    const key = this.SESSION_PREFIX + sessionId;

    await this.redis.setex(
      key,
      this.SESSION_TTL,
      JSON.stringify({
        userId,
        ...data,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      })
    );

    this.logger.log(`Session created: ${sessionId} for user ${userId}`);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<any> {
    const key = this.SESSION_PREFIX + sessionId;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (session) {
      session.lastActivity = new Date().toISOString();
      const key = this.SESSION_PREFIX + sessionId;
      
      await this.redis.setex(
        key,
        this.SESSION_TTL,
        JSON.stringify(session)
      );
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = this.SESSION_PREFIX + sessionId;
    await this.redis.del(key);
    this.logger.log(`Session deleted: ${sessionId}`);
  }

  async getUserSessions(userId: string): Promise<any[]> {
    const keys = await this.redis.keys(this.SESSION_PREFIX + '*');
    const sessions: any[] = [];

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

  async getAllSessions(): Promise<any[]> {
    const keys = await this.redis.keys(this.SESSION_PREFIX + '*');
    const sessions: any[] = [];

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

    return sessions.sort((a: any, b: any) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

