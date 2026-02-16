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
var DittofeedDbReaderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DittofeedDbReaderService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let DittofeedDbReaderService = DittofeedDbReaderService_1 = class DittofeedDbReaderService {
    logger = new common_1.Logger(DittofeedDbReaderService_1.name);
    pool = null;
    constructor() {
        this.initPool();
    }
    initPool() {
        const dbUrl = process.env.DITTOFEED_DB_URL;
        if (!dbUrl) {
            this.logger.warn('Dittofeed DB reader not configured (DITTOFEED_DB_URL missing)');
            return;
        }
        this.pool = new pg_1.Pool({
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
    async query(sql, params = []) {
        if (!this.pool) {
            throw new Error('Dittofeed DB not configured');
        }
        let client;
        try {
            client = await this.pool.connect();
            const result = await client.query(sql, params);
            return result.rows;
        }
        finally {
            client?.release();
        }
    }
    async getCampaignMetrics(days = 30) {
        try {
            const rows = await this.query(`SELECT
          COUNT(*) FILTER (WHERE status = 'sent') AS total_sent,
          COUNT(*) FILTER (WHERE status = 'delivered') AS total_delivered,
          COUNT(*) FILTER (WHERE status = 'opened') AS total_opened,
          COUNT(*) FILTER (WHERE status = 'clicked') AS total_clicked,
          COUNT(*) FILTER (WHERE status = 'bounced') AS total_bounced,
          COUNT(*) FILTER (WHERE status = 'unsubscribed') AS total_unsubscribed
        FROM message_events
        WHERE created_at >= NOW() - make_interval(days => $1)`, [Math.max(1, Math.floor(days))]);
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
        }
        catch (err) {
            this.logger.error(`Campaign metrics query failed: ${err.message}`);
            return {
                totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0,
                totalBounced: 0, totalUnsubscribed: 0, openRate: 0, clickRate: 0, bounceRate: 0,
            };
        }
    }
    async getJourneyMetrics() {
        try {
            const rows = await this.query(`SELECT
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
        ORDER BY total_entered DESC`);
            return rows.map((r) => {
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
        }
        catch (err) {
            this.logger.error(`Journey metrics query failed: ${err.message}`);
            return [];
        }
    }
    async getMessagePerformance(days = 30) {
        try {
            const rows = await this.query(`SELECT
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
        ORDER BY sent DESC`, [Math.max(1, Math.floor(days))]);
            return rows.map((r) => {
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
        }
        catch (err) {
            this.logger.error(`Message performance query failed: ${err.message}`);
            return [];
        }
    }
    async getSegmentCounts() {
        try {
            const rows = await this.query(`SELECT
          s.name AS segment_name,
          COUNT(DISTINCT sm.user_id) AS user_count
        FROM segments s
        LEFT JOIN segment_memberships sm ON s.id = sm.segment_id
        GROUP BY s.id, s.name
        ORDER BY user_count DESC`);
            return rows.map((r) => ({
                segmentName: r.segment_name || 'Unknown',
                count: Number(r.user_count || 0),
            }));
        }
        catch (err) {
            this.logger.error(`Segment counts query failed: ${err.message}`);
            return [];
        }
    }
    async getDailyTrends(days = 14) {
        try {
            const rows = await this.query(`SELECT
          DATE(created_at) AS day,
          COUNT(*) FILTER (WHERE status = 'sent') AS sent,
          COUNT(*) FILTER (WHERE status = 'opened') AS opened,
          COUNT(*) FILTER (WHERE status = 'clicked') AS clicked
        FROM message_events
        WHERE created_at >= NOW() - make_interval(days => $1)
        GROUP BY DATE(created_at)
        ORDER BY day ASC`, [Math.max(1, Math.floor(days))]);
            return rows.map((r) => ({
                date: r.day instanceof Date ? r.day.toISOString().split('T')[0] : String(r.day),
                sent: Number(r.sent || 0),
                opened: Number(r.opened || 0),
                clicked: Number(r.clicked || 0),
            }));
        }
        catch (err) {
            this.logger.error(`Daily trends query failed: ${err.message}`);
            return [];
        }
    }
    async getFullAnalytics(days = 30) {
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
    async healthCheck() {
        try {
            await this.query('SELECT 1');
            return { connected: true };
        }
        catch (err) {
            return { connected: false, error: err.message };
        }
    }
    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.end();
            this.logger.log('Dittofeed DB pool closed');
        }
    }
};
exports.DittofeedDbReaderService = DittofeedDbReaderService;
exports.DittofeedDbReaderService = DittofeedDbReaderService = DittofeedDbReaderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DittofeedDbReaderService);
//# sourceMappingURL=dittofeed-db-reader.service.js.map