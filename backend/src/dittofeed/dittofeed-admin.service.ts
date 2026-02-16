import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

/**
 * Dittofeed Admin API Service
 *
 * Dittofeed'in Admin API'si ile segment, journey, template gibi
 * kaynakları programmatik olarak yönetir.
 *
 * NOT: Admin API, kullanıcı veri API'sinden (identify/track) farklı
 * bir authentication key kullanır (DITTOFEED_ADMIN_API_KEY).
 *
 * Endpoint base: DITTOFEED_HOST/api/admin
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types — Dittofeed Admin API payloads
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SegmentCondition {
  type: 'trait' | 'event' | 'subscription';
  trait?: string;
  operator: string;
  value?: string | number | boolean;
  event?: string;
  // Event conditions
  times?: number;
  withinDays?: number;
}

interface SegmentDefinition {
  name: string;
  description?: string;
  type: 'computed';
  definition: {
    entryNode: {
      id: string;
      type: 'Segment';
      children: SegmentNode[];
    };
  };
}

interface SegmentNode {
  id: string;
  type: 'And' | 'Or' | 'Trait' | 'Performed' | 'LastPerformed' | 'HasBeen';
  children?: SegmentNode[];
  // Trait node
  path?: string;
  operator?:
    | 'Equals'
    | 'NotEquals'
    | 'Exists'
    | 'NotExists'
    | 'GreaterThanOrEqual'
    | 'LessThan'
    | 'Within';
  value?: any;
  // Event node
  event?: string;
  times?: number;
  timesOperator?: 'GreaterThanOrEqual' | 'LessThan' | 'Equals';
  withinSeconds?: number;
  hasBeen?: 'HasBeen' | 'HasNotBeen';
}

interface JourneyDefinition {
  name: string;
  status?: 'NotStarted' | 'Running' | 'Paused';
  definition: {
    entryNode: JourneyNode;
    exitNode: { type: 'ExitNode'; id: string };
    nodes: JourneyNode[];
  };
}

interface JourneyNode {
  id: string;
  type:
    | 'SegmentEntryNode'
    | 'EventEntryNode'
    | 'DelayNode'
    | 'MessageNode'
    | 'SegmentSplitNode'
    | 'WaitForNode'
    | 'ExitNode';
  // SegmentEntryNode
  segment?: string;
  // EventEntryNode
  event?: string;
  // DelayNode
  seconds?: number;
  // MessageNode
  channel?: 'Email' | 'Sms' | 'Webhook' | 'MobilePush';
  templateId?: string;
  // SegmentSplitNode
  segmentId?: string;
  // Children
  child?: string;
  trueChild?: string;
  falseChild?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Predefined Segment Templates — DTF sektör-spesifik
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SEGMENT_TEMPLATES = {
  // ── Tier-Based ──
  platinum_b2b: {
    name: 'Platinum B2B',
    description: 'CLV > $10K, 20+ orders, 3+ years',
    conditions: [
      { type: 'trait', path: 'predicted_clv', operator: 'GreaterThanOrEqual', value: 10000 },
      { type: 'trait', path: 'total_orders', operator: 'GreaterThanOrEqual', value: 20 },
    ],
    logic: 'And',
  },
  gold_b2b: {
    name: 'Gold B2B',
    description: 'CLV $5-10K, 10-20 orders',
    conditions: [
      { type: 'trait', path: 'predicted_clv', operator: 'GreaterThanOrEqual', value: 5000 },
      { type: 'trait', path: 'predicted_clv', operator: 'LessThan', value: 10000 },
      { type: 'trait', path: 'total_orders', operator: 'GreaterThanOrEqual', value: 10 },
    ],
    logic: 'And',
  },
  silver_b2b: {
    name: 'Silver B2B',
    description: 'CLV $1-5K, 5-10 orders',
    conditions: [
      { type: 'trait', path: 'predicted_clv', operator: 'GreaterThanOrEqual', value: 1000 },
      { type: 'trait', path: 'predicted_clv', operator: 'LessThan', value: 5000 },
    ],
    logic: 'And',
  },
  bronze_b2b: {
    name: 'Bronze B2B',
    description: 'CLV < $1K, < 5 orders',
    conditions: [
      { type: 'trait', path: 'predicted_clv', operator: 'LessThan', value: 1000 },
    ],
    logic: 'And',
  },

  // ── Behavioral ──
  gang_sheet_power_users: {
    name: 'Gang Sheet Power Users',
    description: '5+ gang sheet orders per month',
    conditions: [
      { type: 'trait', path: 'favorite_product_type', operator: 'Equals', value: 'gang_sheet' },
      { type: 'trait', path: 'total_orders', operator: 'GreaterThanOrEqual', value: 15 },
    ],
    logic: 'And',
  },
  size_only_buyers: {
    name: 'Size-Only Buyers (No Gang Sheet)',
    description: 'Buys by-size transfers but never used gang sheets',
    conditions: [
      { type: 'trait', path: 'favorite_product_type', operator: 'Equals', value: 'by_size' },
      { type: 'trait', path: 'gang_sheet_fill_rate', operator: 'NotExists' },
    ],
    logic: 'And',
  },
  at_risk_customers: {
    name: 'At-Risk Customers',
    description: 'High churn risk — engagement dropping',
    conditions: [
      { type: 'trait', path: 'churn_risk_level', operator: 'Equals', value: 'high' },
    ],
    logic: 'And',
  },
  dormant_accounts: {
    name: 'Dormant Accounts',
    description: '60+ days since last order',
    conditions: [
      { type: 'trait', path: 'days_since_last_order', operator: 'GreaterThanOrEqual', value: 60 },
    ],
    logic: 'And',
  },
  uv_dtf_specialists: {
    name: 'UV DTF Specialists',
    description: 'Primary product type is UV DTF',
    conditions: [
      { type: 'trait', path: 'preferred_transfer_type', operator: 'Equals', value: 'uv_dtf' },
    ],
    logic: 'And',
  },
  pickup_regulars: {
    name: 'Pickup Regulars',
    description: 'Prefer pickup over shipping',
    conditions: [
      { type: 'trait', path: 'pickup_preferred', operator: 'Equals', value: true },
    ],
    logic: 'And',
  },
  supply_buyers: {
    name: 'Supply Buyers (DIY Printers)',
    description: 'Purchases ink, film, powder — runs own DTF printer',
    conditions: [
      { type: 'trait', path: 'is_supply_buyer', operator: 'Equals', value: true },
    ],
    logic: 'And',
  },
  new_customers: {
    name: 'New Customers (First Order)',
    description: 'Just placed their first order',
    conditions: [
      { type: 'trait', path: 'total_orders', operator: 'Equals', value: 1 },
    ],
    logic: 'And',
  },
  high_value_at_risk: {
    name: 'High-Value At-Risk',
    description: 'Gold/Platinum tier with high churn risk — priority win-back',
    conditions: [
      { type: 'trait', path: 'predicted_clv', operator: 'GreaterThanOrEqual', value: 5000 },
      { type: 'trait', path: 'churn_risk_level', operator: 'Equals', value: 'high' },
    ],
    logic: 'And',
  },
} as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Service
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@Injectable()
export class DittofeedAdminService {
  private readonly logger = new Logger(DittofeedAdminService.name);
  private client: AxiosInstance | null = null;

  constructor() {
    this.initClient();
  }

  private initClient() {
    const host = process.env.DITTOFEED_HOST;
    const apiKey = process.env.DITTOFEED_ADMIN_API_KEY;

    if (!host || !apiKey) {
      this.logger.warn('Dittofeed Admin API not configured (DITTOFEED_HOST or DITTOFEED_ADMIN_API_KEY missing)');
      return;
    }

    this.client = axios.create({
      baseURL: `${host}/api/admin`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.logger.log('Dittofeed Admin API client initialized');
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error('Dittofeed Admin API not configured');
    }
    return this.client;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SEGMENT MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Tüm predefined segment'leri Dittofeed'de oluşturur
   * Yeni store kurulumunda otomatik çağrılır
   */
  async setupAllSegments(workspaceId?: string): Promise<{ created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;

    for (const [key, template] of Object.entries(SEGMENT_TEMPLATES)) {
      try {
        await this.createSegmentFromTemplate(key, template);
        created++;
        this.logger.log(`Segment created: ${template.name}`);
      } catch (err: any) {
        const msg = `Segment "${template.name}" failed: ${err.message}`;
        errors.push(msg);
        this.logger.warn(msg);
      }
    }

    return { created, errors };
  }

  /**
   * Template'den segment oluşturur
   */
  private async createSegmentFromTemplate(key: string, template: any) {
    const client = this.ensureClient();

    // Build segment definition nodes
    const conditionNodes: SegmentNode[] = template.conditions.map(
      (cond: any, i: number) => ({
        id: `cond-${key}-${i}`,
        type: 'Trait' as const,
        path: cond.path,
        operator: cond.operator,
        value: cond.value,
      }),
    );

    const definition: SegmentDefinition = {
      name: template.name,
      description: template.description,
      type: 'computed',
      definition: {
        entryNode: {
          id: `entry-${key}`,
          type: 'Segment',
          children: [
            {
              id: `logic-${key}`,
              type: template.logic || 'And',
              children: conditionNodes,
            },
          ],
        },
      },
    };

    await client.put('/segments', definition);
  }

  /**
   * Custom segment oluşturur (admin panelden)
   */
  async createCustomSegment(
    name: string,
    conditions: { trait: string; operator: string; value: any }[],
    logic: 'And' | 'Or' = 'And',
  ) {
    const client = this.ensureClient();

    const conditionNodes: SegmentNode[] = conditions.map((cond, i) => ({
      id: `custom-cond-${i}`,
      type: 'Trait' as const,
      path: cond.trait,
      operator: cond.operator as any,
      value: cond.value,
    }));

    const definition: SegmentDefinition = {
      name,
      type: 'computed',
      definition: {
        entryNode: {
          id: 'entry-custom',
          type: 'Segment',
          children: [
            {
              id: 'logic-custom',
              type: logic,
              children: conditionNodes,
            },
          ],
        },
      },
    };

    const res = await client.put('/segments', definition);
    return res.data;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // JOURNEY MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Journey listele */
  async listJourneys() {
    const client = this.ensureClient();
    const res = await client.get('/journeys');
    return res.data;
  }

  /**
   * Journey'nin statusunu değiştir (start, pause, stop)
   */
  async setJourneyStatus(journeyId: string, status: 'Running' | 'Paused' | 'NotStarted') {
    const client = this.ensureClient();
    const res = await client.put(`/journeys/${journeyId}/status`, { status });
    return res.data;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TEMPLATE MANAGEMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Email template listele */
  async listTemplates() {
    const client = this.ensureClient();
    const res = await client.get('/templates');
    return res.data;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WORKSPACE INFO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Workspace bilgisi al */
  async getWorkspaceInfo() {
    const client = this.ensureClient();
    const res = await client.get('/workspaces');
    return res.data;
  }

  /** Mevcut segment listesi */
  async listSegments() {
    const client = this.ensureClient();
    const res = await client.get('/segments');
    return res.data;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HEALTH CHECK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Admin API bağlantı kontrolü */
  async healthCheck(): Promise<{ connected: boolean; error?: string }> {
    try {
      const client = this.ensureClient();
      await client.get('/workspaces');
      return { connected: true };
    } catch (err: any) {
      return { connected: false, error: err.message };
    }
  }

  /** Kullanılabilir segment template listesi (client-side gösterim için) */
  getAvailableSegmentTemplates() {
    return Object.entries(SEGMENT_TEMPLATES).map(([key, template]) => ({
      key,
      name: template.name,
      description: template.description,
      conditionCount: template.conditions.length,
    }));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // JOURNEY SETUP — Predefined journey definitions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** 7 predefined journey tanımı */
  private getJourneyTemplates(): Array<{
    key: string;
    name: string;
    description: string;
    triggerType: 'segment' | 'event';
    triggerValue: string;
    steps: Array<{
      type: 'delay' | 'email' | 'sms' | 'webhook';
      delaySeconds?: number;
      templateKey?: string;
      channel?: string;
      webhookUrl?: string;
    }>;
  }> {
    return [
      {
        key: 'onboarding',
        name: 'New Customer Onboarding',
        description: 'Welcome series for first-time buyers — 3 emails over 7 days',
        triggerType: 'event',
        triggerValue: 'order_placed',
        steps: [
          { type: 'email', templateKey: 'welcome_email' },
          { type: 'delay', delaySeconds: 2 * 24 * 3600 }, // 2 days
          { type: 'email', templateKey: 'how_to_order' },
          { type: 'delay', delaySeconds: 5 * 24 * 3600 }, // 5 days
          { type: 'email', templateKey: 'gang_sheet_intro' },
        ],
      },
      {
        key: 'reorder_reminder',
        name: 'Reorder Reminder',
        description: 'Remind customers to reorder based on predicted next order date',
        triggerType: 'segment',
        triggerValue: 'dormant_accounts',
        steps: [
          { type: 'email', templateKey: 'reorder_reminder' },
          { type: 'delay', delaySeconds: 3 * 24 * 3600 },
          { type: 'email', templateKey: 'reorder_incentive' },
          { type: 'delay', delaySeconds: 7 * 24 * 3600 },
          { type: 'sms', templateKey: 'reorder_sms' },
        ],
      },
      {
        key: 'at_risk_winback',
        name: 'At-Risk Customer Win-back',
        description: 'Win-back sequence for high churn risk customers',
        triggerType: 'segment',
        triggerValue: 'at_risk_customers',
        steps: [
          { type: 'email', templateKey: 'winback_miss_you' },
          { type: 'delay', delaySeconds: 5 * 24 * 3600 },
          { type: 'email', templateKey: 'winback_discount' },
          { type: 'delay', delaySeconds: 10 * 24 * 3600 },
          { type: 'email', templateKey: 'winback_last_chance' },
        ],
      },
      {
        key: 'pickup_notification',
        name: 'Pickup Ready Notification',
        description: 'Notify customer when order is ready for pickup',
        triggerType: 'event',
        triggerValue: 'pickup_ready',
        steps: [
          { type: 'email', templateKey: 'pickup_ready' },
          { type: 'sms', templateKey: 'pickup_ready_sms' },
          { type: 'delay', delaySeconds: 2 * 24 * 3600 },
          { type: 'email', templateKey: 'pickup_reminder' },
          { type: 'delay', delaySeconds: 1 * 24 * 3600 },
          { type: 'sms', templateKey: 'pickup_urgent_sms' },
        ],
      },
      {
        key: 'supply_reorder',
        name: 'Supply Reorder Prediction',
        description: 'Proactive supply reorder alerts based on consumption patterns',
        triggerType: 'event',
        triggerValue: 'supply_running_low',
        steps: [
          { type: 'email', templateKey: 'supply_reorder' },
          { type: 'delay', delaySeconds: 3 * 24 * 3600 },
          { type: 'email', templateKey: 'supply_reorder_reminder' },
        ],
      },
      {
        key: 'gang_sheet_upgrade',
        name: 'Gang Sheet Upgrade',
        description: 'Convert by-size buyers to gang sheet users',
        triggerType: 'segment',
        triggerValue: 'size_only_buyers',
        steps: [
          { type: 'email', templateKey: 'gang_sheet_intro' },
          { type: 'delay', delaySeconds: 7 * 24 * 3600 },
          { type: 'email', templateKey: 'gang_sheet_savings' },
        ],
      },
      {
        key: 'post_purchase_review',
        name: 'Post-Purchase Review Request',
        description: 'Request review after successful order delivery',
        triggerType: 'event',
        triggerValue: 'pickup_completed',
        steps: [
          { type: 'delay', delaySeconds: 3 * 24 * 3600 },
          { type: 'email', templateKey: 'review_request' },
          { type: 'delay', delaySeconds: 7 * 24 * 3600 },
          { type: 'email', templateKey: 'review_reminder' },
        ],
      },
    ];
  }

  /**
   * Tüm predefined journey'leri oluşturur
   */
  async setupAllJourneys(): Promise<{ created: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;
    const templates = this.getJourneyTemplates();

    for (const journey of templates) {
      try {
        await this.createJourneyFromTemplate(journey);
        created++;
        this.logger.log(`Journey created: ${journey.name}`);
      } catch (err: any) {
        const msg = `Journey "${journey.name}" failed: ${err.message}`;
        errors.push(msg);
        this.logger.warn(msg);
      }
    }

    return { created, errors };
  }

  private async createJourneyFromTemplate(template: any) {
    const client = this.ensureClient();

    // Build journey node graph
    const nodes: any[] = [];
    let previousNodeId = 'entry';

    for (let i = 0; i < template.steps.length; i++) {
      const step = template.steps[i];
      const nodeId = `node-${template.key}-${i}`;
      const nextNodeId = i < template.steps.length - 1 ? `node-${template.key}-${i + 1}` : 'exit';

      if (step.type === 'delay') {
        nodes.push({
          id: nodeId,
          type: 'DelayNode',
          seconds: step.delaySeconds,
          child: nextNodeId,
        });
      } else if (step.type === 'email' || step.type === 'sms') {
        nodes.push({
          id: nodeId,
          type: 'MessageNode',
          channel: step.type === 'email' ? 'Email' : 'Sms',
          name: step.templateKey,
          child: nextNodeId,
        });
      } else if (step.type === 'webhook') {
        nodes.push({
          id: nodeId,
          type: 'MessageNode',
          channel: 'Webhook',
          name: step.templateKey || 'webhook_callback',
          child: nextNodeId,
        });
      }
    }

    const entryNode: any =
      template.triggerType === 'event'
        ? { id: 'entry', type: 'EventEntryNode', event: template.triggerValue, child: nodes[0]?.id || 'exit' }
        : { id: 'entry', type: 'SegmentEntryNode', segment: template.triggerValue, child: nodes[0]?.id || 'exit' };

    const definition = {
      name: template.name,
      status: 'NotStarted',
      definition: {
        entryNode,
        exitNode: { id: 'exit', type: 'ExitNode' },
        nodes: [entryNode, ...nodes, { id: 'exit', type: 'ExitNode' }],
      },
    };

    await client.put('/journeys', definition);
  }

  /** Kullanılabilir journey template listesi */
  getAvailableJourneyTemplates() {
    return this.getJourneyTemplates().map((j) => ({
      key: j.key,
      name: j.name,
      description: j.description,
      triggerType: j.triggerType,
      triggerValue: j.triggerValue,
      stepCount: j.steps.length,
    }));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EMAIL TEMPLATE SETUP
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Predefined email template tanımları */
  private getEmailTemplates(): Array<{
    key: string;
    name: string;
    subject: string;
    body: string;
  }> {
    return [
      {
        key: 'welcome_email',
        name: 'Welcome — New Customer',
        subject: 'Welcome to {{company_name}}! 🎉',
        body: `<h1>Welcome, {{first_name}}!</h1>
<p>Thank you for your first order. We're excited to have you as a customer!</p>
<p>Here's what you need to know:</p>
<ul>
  <li>📦 Your order #{{last_order_number}} is being processed</li>
  <li>🎨 Upload designs in our <a href="{{gang_sheet_builder_url}}">Gang Sheet Builder</a></li>
  <li>⏰ Standard turnaround: 24-48 hours</li>
  <li>📍 Pickup available at our NJ location</li>
</ul>
<p>Questions? Reply to this email — we're here to help!</p>`,
      },
      {
        key: 'reorder_reminder',
        name: 'Reorder Reminder',
        subject: "It's been a while — time to reorder? 🔄",
        body: `<h1>Hey {{first_name}},</h1>
<p>It's been {{days_since_last_order}} days since your last order. Based on your ordering pattern, you usually reorder around this time.</p>
<p><strong>Your last order:</strong> #{{last_order_number}} — $\{{last_order_value}}</p>
{% if preferred_transfer_type == 'gang_sheet' %}
<p>Ready to build your next gang sheet? <a href="{{gang_sheet_builder_url}}">Start here →</a></p>
{% else %}
<p>Browse our latest DTF transfers: <a href="{{store_url}}">Shop Now →</a></p>
{% endif %}`,
      },
      {
        key: 'winback_discount',
        name: 'Win-back — Exclusive Discount',
        subject: 'We miss you! Here\'s 15% off your next order 💰',
        body: `<h1>We miss you, {{first_name}}!</h1>
<p>It's been a while since your last order. We'd love to see you back!</p>
<p>Use code <strong>COMEBACK15</strong> for 15% off your next order.</p>
<p>This offer expires in 7 days.</p>
<a href="{{store_url}}?discount=COMEBACK15" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Shop Now & Save 15%</a>`,
      },
      {
        key: 'pickup_ready',
        name: 'Pickup Ready Notification',
        subject: '✅ Order #{{order_number}} is ready for pickup!',
        body: `<h1>Your order is ready! ✅</h1>
<p>Order #{{order_number}} is packaged and waiting for you.</p>
<p><strong>Pickup Details:</strong></p>
<ul>
  <li>📍 Location: {{pickup_location}}</li>
  <li>🗄️ Shelf: {{shelf_code}}</li>
  <li>📱 QR Code: Show this email or scan at the kiosk</li>
  <li>⏰ Hours: Mon-Fri 9am-6pm, Sat 10am-2pm</li>
</ul>
<p>Please pick up within 5 business days.</p>`,
      },
      {
        key: 'supply_reorder',
        name: 'Supply Reorder Alert',
        subject: '⚠️ Your {{supply_category}} supply is running low',
        body: `<h1>Time to restock, {{first_name}}!</h1>
<p>Based on your usage patterns, your <strong>{{supply_category}}</strong> supply is estimated to run out in <strong>{{days_until_empty}} days</strong>.</p>
<p>Don't let your printer run dry — order now for timely delivery.</p>
{% if supply_category == 'ink' %}
<a href="{{store_url}}/collections/dtf-ink">Reorder DTF Ink →</a>
{% elsif supply_category == 'film' %}
<a href="{{store_url}}/collections/dtf-film">Reorder DTF Film →</a>
{% elsif supply_category == 'powder' %}
<a href="{{store_url}}/collections/transfer-powder">Reorder Transfer Powder →</a>
{% endif %}
<p>💡 <strong>Pro tip:</strong> Bundle Ink + Film + Powder and save 10%!</p>`,
      },
      {
        key: 'gang_sheet_intro',
        name: 'Cross-sell — Gang Sheet Introduction',
        subject: 'Save up to 40% with Gang Sheets! 📐',
        body: `<h1>Did you know you could save 40%?</h1>
<p>Hi {{first_name}}, we noticed you've been ordering by-size transfers. That's great — but you could save significantly with our Gang Sheet service!</p>
<p><strong>How it works:</strong></p>
<ol>
  <li>Upload multiple designs</li>
  <li>Our builder automatically arranges them on a sheet</li>
  <li>You only pay for the sheet size — not per design</li>
  <li>More designs per sheet = bigger savings!</li>
</ol>
<p>Customers who switch save an average of <strong>35%</strong> on transfers.</p>
<a href="{{gang_sheet_builder_url}}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Try Gang Sheet Builder →</a>`,
      },
      {
        key: 'review_request',
        name: 'Post-Purchase Review Request',
        subject: 'How was your order? ⭐',
        body: `<h1>How was your experience? ⭐</h1>
<p>Hi {{first_name}}, your order #{{last_order_number}} was picked up {{days_since_pickup}} days ago.</p>
<p>We'd love to hear your feedback! Your review helps us improve and helps other businesses find quality DTF transfers.</p>
<a href="{{review_url}}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Leave a Review →</a>
<p>Thank you for choosing {{company_name}}! 🙏</p>`,
      },
    ];
  }

  /**
   * Tüm email template'leri oluşturur
   */
  async setupAllEmailTemplates(): Promise<{ created: number; errors: string[] }> {
    const client = this.ensureClient();
    const errors: string[] = [];
    let created = 0;

    for (const template of this.getEmailTemplates()) {
      try {
        await client.put('/templates', {
          name: template.name,
          type: 'Email',
          definition: {
            subject: template.subject,
            body: template.body,
            from: '{{sender_email}}',
            replyTo: '{{reply_to_email}}',
          },
        });
        created++;
        this.logger.log(`Email template created: ${template.name}`);
      } catch (err: any) {
        const msg = `Template "${template.name}" failed: ${err.message}`;
        errors.push(msg);
        this.logger.warn(msg);
      }
    }

    return { created, errors };
  }

  /** Kullanılabilir email template listesi */
  getAvailableEmailTemplates() {
    return this.getEmailTemplates().map((t) => ({
      key: t.key,
      name: t.name,
      subject: t.subject,
    }));
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FULL STORE SETUP — One-click
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Yeni store kurulumunda tek çağrıyla tüm kaynakları oluşturur:
   * segments + journeys + email templates
   */
  async setupFullStore(): Promise<{
    segments: { created: number; errors: string[] };
    journeys: { created: number; errors: string[] };
    templates: { created: number; errors: string[] };
  }> {
    this.logger.log('Full store setup starting...');

    const [segments, journeys, templates] = await Promise.all([
      this.setupAllSegments(),
      this.setupAllJourneys(),
      this.setupAllEmailTemplates(),
    ]);

    this.logger.log(
      `Full store setup complete: ${segments.created} segments, ${journeys.created} journeys, ${templates.created} templates`,
    );

    return { segments, journeys, templates };
  }
}
