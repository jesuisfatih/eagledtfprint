-- AlterTable: PricingRule
ALTER TABLE "pricing_rules" ADD COLUMN IF NOT EXISTS "target_company_user_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pricing_rules_target_company_user_id_idx" ON "pricing_rules"("target_company_user_id");

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_target_company_user_id_fkey" FOREIGN KEY ("target_company_user_id") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "visitor_sessions" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "fingerprint_id" TEXT NOT NULL,
    "company_user_id" TEXT,
    "company_id" TEXT,
    "session_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "platform" TEXT,
    "language" TEXT,
    "timezone" TEXT,
    "referrer" TEXT,
    "landing_page" TEXT,
    "exit_page" TEXT,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "product_views" INTEGER NOT NULL DEFAULT 0,
    "add_to_carts" INTEGER NOT NULL DEFAULT 0,
    "search_count" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "is_logged_in" BOOLEAN NOT NULL DEFAULT false,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visitor_sessions_merchant_id_session_id_key" ON "visitor_sessions"("merchant_id", "session_id");
CREATE INDEX "visitor_sessions_merchant_id_idx" ON "visitor_sessions"("merchant_id");
CREATE INDEX "visitor_sessions_fingerprint_id_idx" ON "visitor_sessions"("fingerprint_id");
CREATE INDEX "visitor_sessions_company_user_id_idx" ON "visitor_sessions"("company_user_id");
CREATE INDEX "visitor_sessions_company_id_idx" ON "visitor_sessions"("company_id");
CREATE INDEX "visitor_sessions_started_at_idx" ON "visitor_sessions"("started_at");

-- AddForeignKeys
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_fingerprint_id_fkey" FOREIGN KEY ("fingerprint_id") REFERENCES "visitor_fingerprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_company_user_id_fkey" FOREIGN KEY ("company_user_id") REFERENCES "company_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "visitor_events" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "fingerprint_id" TEXT,
    "company_user_id" TEXT,
    "company_id" TEXT,
    "event_type" TEXT NOT NULL,
    "page_url" TEXT,
    "page_path" TEXT,
    "page_title" TEXT,
    "referrer" TEXT,
    "shopify_product_id" BIGINT,
    "shopify_variant_id" BIGINT,
    "product_title" TEXT,
    "product_price" DECIMAL(12,2),
    "quantity" INTEGER,
    "search_query" TEXT,
    "cart_value" DECIMAL(12,2),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitor_events_merchant_id_idx" ON "visitor_events"("merchant_id");
CREATE INDEX "visitor_events_session_id_idx" ON "visitor_events"("session_id");
CREATE INDEX "visitor_events_company_user_id_idx" ON "visitor_events"("company_user_id");
CREATE INDEX "visitor_events_company_id_idx" ON "visitor_events"("company_id");
CREATE INDEX "visitor_events_event_type_idx" ON "visitor_events"("event_type");
CREATE INDEX "visitor_events_created_at_idx" ON "visitor_events"("created_at");
CREATE INDEX "visitor_events_shopify_product_id_idx" ON "visitor_events"("shopify_product_id");

-- AddForeignKeys
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "visitor_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_fingerprint_id_fkey" FOREIGN KEY ("fingerprint_id") REFERENCES "visitor_fingerprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_company_user_id_fkey" FOREIGN KEY ("company_user_id") REFERENCES "company_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visitor_events" ADD CONSTRAINT "visitor_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "company_intelligence" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "total_visitors" INTEGER NOT NULL DEFAULT 0,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "total_page_views" INTEGER NOT NULL DEFAULT 0,
    "total_product_views" INTEGER NOT NULL DEFAULT 0,
    "total_add_to_carts" INTEGER NOT NULL DEFAULT 0,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avg_session_duration" INTEGER NOT NULL DEFAULT 0,
    "avg_order_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "buyer_intent" TEXT NOT NULL DEFAULT 'cold',
    "segment" TEXT NOT NULL DEFAULT 'new',
    "top_viewed_products" JSONB,
    "top_purchased_products" JSONB,
    "top_categories" JSONB,
    "preferred_brands" JSONB,
    "last_active_at" TIMESTAMP(3),
    "first_order_at" TIMESTAMP(3),
    "last_order_at" TIMESTAMP(3),
    "days_since_last_order" INTEGER,
    "order_frequency_days" INTEGER,
    "suggested_discount" DOUBLE PRECISION,
    "suggested_products" JSONB,
    "churn_risk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upsell_potential" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_intelligence_company_id_key" ON "company_intelligence"("company_id");
CREATE INDEX "company_intelligence_merchant_id_idx" ON "company_intelligence"("merchant_id");
CREATE INDEX "company_intelligence_company_id_idx" ON "company_intelligence"("company_id");
CREATE INDEX "company_intelligence_engagement_score_idx" ON "company_intelligence"("engagement_score");
CREATE INDEX "company_intelligence_segment_idx" ON "company_intelligence"("segment");

-- AddForeignKeys
ALTER TABLE "company_intelligence" ADD CONSTRAINT "company_intelligence_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_intelligence" ADD CONSTRAINT "company_intelligence_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
