import { Injectable, Logger } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Dittofeed Database Direct Read Service
 *
 * Dittofeed'in PostgreSQL veritabanına doğrudan bağlanarak
 * kampanya performans metriklerini, mesaj istatistiklerini
 * ve journey analytics verilerini okur.
 *
 * Bu veriler admin dashboard'da gösterilir.
 *
 * ENV: DITTOFEED_DB_URL (postgresql://...)
 */

export interface CampaignMetrics {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface JourneyMetrics {
  journeyName: string;
  totalEntered: number;
  totalCompleted: number;
  totalActive: number;
  completionRate: number;
  avgCompletionTimeHours: number;
}

export interface MessagePerformance {
  templateName: string;
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

@Injectable()
export class DittofeedDbReaderService {
  private readonly logger = new Logger(DittofeedDbReaderService.name);
  private pool: Pool | null = null;

  constructor() {
    this.initPool();
  }

  private initPool() {
    const dbUrl = process.env.DITTOFEED_DB_URL;
    if (!dbUrl) {
      this.logger.warn('Dittofeed DB reader not configured (DITTOFEED_DB_URL missing)');
      return;
    }

    this.pool = new Pool({
      connectionString: dbUrl,
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      this.logger.error(`Dittofeed DB pool error: ${err.message}`);
    });

    this.logger.log('Dittofeed DB reader pool initialized');
  }

  private async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Dittofeed DB not configured');
    }

    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client?.release();
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CAMPAIGN ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Genel email kampanya metrikleri
   * Son N gün içindeki toplam istatistikler
   */
  async getCampaignMetrics(days: number = 30): Promise<CampaignMetrics> {
    try {
      const rows = await this.query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'sent') AS total_sent,
          COUNT(*) FILTER (WHERE status = 'delivered') AS total_delivered,
          COUNT(*) FILTER (WHERE status = 'opened') AS total_opened,
          COUNT(*) FILTER (WHERE status = 'clicked') AS total_clicked,
          COUNT(*) FILTER (WHERE status = 'bounced') AS total_bounced,
          COUNT(*) FILTER (WHERE status = 'unsubscribed') AS total_unsubscribed
        FROM message_events
        WHERE created_at >= NOW() - make_interval(days => $1)`,
        [Math.max(1, Math.floor(days))],
      );

      const row = rows[0] || {};
      const sent = Number(row.total_sent || 0);
      const delivered = Number(row.total_delivered || 0);
      const opened = Number(row.total_opened || 0);
      const clicked = Number(row.total_clicked || 0);

      return {
        totalSent: sent,
        totalDelivered: delivered,
        totalOpened: opened,
        totalClicked: clicked,
        totalBounced: Number(row.total_bounced || 0),
        totalUnsubscribed: Number(row.total_unsubscribed || 0),
        openRate: delivered > 0 ? Math.round((opened / delivered) * 10000) / 100 : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 10000) / 100 : 0,
        bounceRate: sent > 0 ? Math.round((Number(row.total_bounced || 0) / sent) * 10000) / 100 : 0,
      };
    } catch (err: any) {
      this.logger.error(`Campaign metrics query failed: ${err.message}`);
      return {
        totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0,
        totalBounced: 0, totalUnsubscribed: 0, openRate: 0, clickRate: 0, bounceRate: 0,
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // JOURNEY ANALYTICS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Journey bazlı metrikler */
  async getJourneyMetrics(): Promise<JourneyMetrics[]> {
    try {
      const rows = await this.query(
        `SELECT
          j.name AS journey_name,
          COUNT(DISTINCT je.user_id) AS total_entered,
          COUNT(DISTINCT je.user_id) FILTER (WHERE je.type = 'completed') AS total_completed,
          COUNT(DISTINCT je.user_id) FILTER (WHERE je.type = 'running') AS total_active,
          AVG(
            EXTRACT(EPOCH FROM (je.completed_at - je.created_at)) / 3600
          ) FILTER (WHERE je.type = 'completed') AS avg_completion_hours
        FROM journeys j
        LEFT JOIN journey_events je ON j.id = je.journey_id
        GROUP BY j.id, j.name
        ORDER BY total_entered DESC`,
      );

      return rows.map((r: any) => {
        const entered = Number(r.total_entered || 0);
        const completed = Number(r.total_completed || 0);
        return {
          journeyName: r.journey_name || 'Unknown',
          totalEntered: entered,
          totalCompleted: completed,
          totalActive: Number(r.total_active || 0),
          completionRate: entered > 0 ? Math.round((completed / entered) * 10000) / 100 : 0,
          avgCompletionTimeHours: Math.round(Number(r.avg_completion_hours || 0) * 10) / 10,
        };
      });
    } catch (err: any) {
      this.logger.error(`Journey metrics query failed: ${err.message}`);
      return [];
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MESSAGE PERFORMANCE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Template bazlı mesaj performansı */
  async getMessagePerformance(days: number = 30): Promise<MessagePerformance[]> {
    try {
      const rows = await this.query(
        `SELECT
          t.name AS template_name,
          t.channel,
          COUNT(*) FILTER (WHERE me.status = 'sent') AS sent,
          COUNT(*) FILTER (WHERE me.status = 'delivered') AS delivered,
          COUNT(*) FILTER (WHERE me.status = 'opened') AS opened,
          COUNT(*) FILTER (WHERE me.status = 'clicked') AS clicked
        FROM message_events me
        JOIN templates t ON me.template_id = t.id
        WHERE me.created_at >= NOW() - make_interval(days => $1)
        GROUP BY t.id, t.name, t.channel
        ORDER BY sent DESC`,
        [Math.max(1, Math.floor(days))],
      );

      return rows.map((r: any) => {
        const sent = Number(r.sent || 0);
        const delivered = Number(r.delivered || 0);
        const opened = Number(r.opened || 0);
        const clicked = Number(r.clicked || 0);
        return {
          templateName: r.template_name || 'Unknown',
          channel: r.channel || 'Email',
          sent,
          delivered,
          opened,
          clicked,
          openRate: delivered > 0 ? Math.round((opened / delivered) * 10000) / 100 : 0,
          clickRate: opened > 0 ? Math.round((clicked / opened) * 10000) / 100 : 0,
        };
      });
    } catch (err: any) {
      this.logger.error(`Message performance query failed: ${err.message}`);
      return [];
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SEGMENT STATS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Segment bazlı kullanıcı sayıları */
  async getSegmentCounts(): Promise<{ segmentName: string; count: number }[]> {
    try {
      const rows = await this.query(
        `SELECT
          s.name AS segment_name,
          COUNT(DISTINCT sm.user_id) AS user_count
        FROM segments s
        LEFT JOIN segment_memberships sm ON s.id = sm.segment_id
        GROUP BY s.id, s.name
        ORDER BY user_count DESC`,
      );

      return rows.map((r: any) => ({
        segmentName: r.segment_name || 'Unknown',
        count: Number(r.user_count || 0),
      }));
    } catch (err: any) {
      this.logger.error(`Segment counts query failed: ${err.message}`);
      return [];
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DAILY TRENDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Günlük email gönderim ve açılma trendi */
  async getDailyTrends(days: number = 14): Promise<
    { date: string; sent: number; opened: number; clicked: number }[]
  > {
    try {
      const rows = await this.query(
        `SELECT
          DATE(created_at) AS day,
          COUNT(*) FILTER (WHERE status = 'sent') AS sent,
          COUNT(*) FILTER (WHERE status = 'opened') AS opened,
          COUNT(*) FILTER (WHERE status = 'clicked') AS clicked
        FROM message_events
        WHERE created_at >= NOW() - make_interval(days => $1)
        GROUP BY DATE(created_at)
        ORDER BY day ASC`,
        [Math.max(1, Math.floor(days))],
      );

      return rows.map((r: any) => ({
        date: r.day instanceof Date ? r.day.toISOString().split('T')[0] : String(r.day),
        sent: Number(r.sent || 0),
        opened: Number(r.opened || 0),
        clicked: Number(r.clicked || 0),
      }));
    } catch (err: any) {
      this.logger.error(`Daily trends query failed: ${err.message}`);
      return [];
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FULL ANALYTICS DASHBOARD DATA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Admin dashboard'a tek çağrıyla tüm analytics */
  async getFullAnalytics(days: number = 30) {
    const [campaign, journeys, messages, segments, trends] = await Promise.all([
      this.getCampaignMetrics(days),
      this.getJourneyMetrics(),
      this.getMessagePerformance(days),
      this.getSegmentCounts(),
      this.getDailyTrends(Math.min(days, 14)),
    ]);

    return {
      campaign,
      journeys,
      messages,
      segments,
      trends,
      period: `${days} days`,
      fetchedAt: new Date().toISOString(),
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HEALTH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  async healthCheck(): Promise<{ connected: boolean; error?: string }> {
    try {
      await this.query('SELECT 1');
      return { connected: true };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Dittofeed DB pool closed');
    }
  }
}
