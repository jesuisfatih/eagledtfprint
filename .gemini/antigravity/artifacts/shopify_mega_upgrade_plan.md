# 🦅 EAGLE SYSTEM — Massive Shopify Sync Upgrade Plan

## Overview
This plan covers 6 major upgrade domains, each with 10+ features, to make Eagle System ultra-synchronized with Shopify.

---

## 🔴 PHASE 1: Product Sync Enhancement (GraphQL Query Expansion + DB Schema)

### Current State
- Products sync: title, handle, description, vendor, type, status, images (basic), tags, variants
- Missing: collections, metafields, SEO data, weight/dimensions, product reviews, media (video/3D), inventory locations, options definition

### 10 New Features
1. **Collection Sync** — Sync Shopify collections (smart + custom) and product-collection mappings
2. **Product Metafields** — Sync all product/variant metafields (material, care instructions, specs)
3. **Product Reviews/Ratings** — Sync Judge.me/Shopify reviews with average rating
4. **Product Media** — Sync all media types (images, videos, 3D models) with alt-text and positions
5. **SEO Data** — Sync SEO title, meta description, URL handle per product
6. **Inventory Tracking** — Track inventory across multiple locations (not just quantity)
7. **Product Options** — Store structured option names/values (Size, Color, Material)
8. **Weight & Dimensions** — Sync weight, dimensions for shipping calculation
9. **Product Tags Enhancement** — Parse tags into categories for smart filtering
10. **Publication Status** — Track which sales channels each product is published to

### Files Modified
- `backend/prisma/schema.prisma` — Expand CatalogProduct, CatalogVariant models
- `backend/src/shopify/shopify-graphql.service.ts` — Expand product query
- `backend/src/sync/workers/products-sync.worker.ts` — Process new fields
- `backend/src/catalog/catalog.service.ts` — Expose new fields in API
- `accounts/app/products/page.tsx` — Show images, reviews, media
- `accounts/app/products/[id]/page.tsx` — Rich product detail page

---

## 🟠 PHASE 2: Customer Intelligence & Returning Customer Value

### Current State
- Customer sync: email, name, phone, tags, note, totalSpent, ordersCount, addresses
- Missing: lifetime value tracking, purchase frequency, RFM segmentation, customer scoring

### 10 New Features
1. **Customer Lifetime Value (CLV)** — Calculate and store projected CLV per customer
2. **Purchase Frequency Score** — Track order frequency, average days between orders
3. **RFM Segmentation** — Automatic Recency-Frequency-Monetary scoring (1-5 each)
4. **Customer Health Score** — Composite score: engagement, spend trend, recency
5. **Churn Risk Detection** — Flag customers who haven't ordered beyond their average gap
6. **Returning Customer Rate** — Dashboard metric showing % returning vs new customers
7. **Customer Journey Tracking** — First touch → first order → repeat order milestones
8. **Preferred Products** — Track most-purchased product categories per customer
9. **Order Pattern Analysis** — Detect seasonal buying patterns (monthly, quarterly)
10. **Customer Segments Auto-Sync** — Auto-tag customers in Shopify based on Eagle segments

### Files Modified
- `backend/prisma/schema.prisma` — Add CustomerInsight model
- `backend/src/shopify-customers/shopify-customers.service.ts` — Expand service
- `backend/src/scheduler/sync.scheduler.ts` — Add CLV/RFM calculation cron
- `admin/app/customers/page.tsx` — Show CLV, RFM, health scores
- `admin/app/segments/page.tsx` — Auto-segmentation UI

---

## 🟡 PHASE 3: Discount & Promotion Sync

### Current State
- Can create/delete basic discount codes
- Missing: sync existing Shopify discounts, automatic discount rules, price rule sync

### 10 New Features
1. **Discount Code Sync** — Pull all active Shopify discount codes into Eagle DB
2. **Automatic Discounts Sync** — Sync automatic discounts (percentage, fixed, BXGY)
3. **Price Rule Import** — Import complex Shopify discount rules
4. **Discount Analytics** — Track usage count, revenue impact, conversion lift per discount
5. **Smart Discount Suggestions** — AI-suggest discounts based on customer segment behavior
6. **Tiered Volume Discounts** — Create volume pricing that auto-syncs to Shopify
7. **Time-Limited Flash Deals** — Create time-boxed deals with countdown timers
8. **Customer-Specific Coupons** — Generate unique codes per customer, track redemption
9. **Bundle Discounts** — Create product bundles with combined pricing
10. **Discount Calendar** — Visual calendar showing all active/upcoming promotions

### Files Modified
- `backend/prisma/schema.prisma` — Add DiscountRule model
- `backend/src/shopify/shopify-admin-discount.service.ts` — Expand with read queries
- `backend/src/sync/workers/discounts-sync.worker.ts` — New sync worker
- `admin/app/pricing/page.tsx` — Enhanced pricing/discount management

---

## 🟢 PHASE 4: Enhanced Order Intelligence

### Current State
- Orders sync: basic fields, line items, addresses, financial/fulfillment status
- Missing: fulfillment tracking, refund sync, order timeline, notes sync, tags sync

### 10 New Features
1. **Fulfillment Tracking** — Sync tracking numbers, carrier info, tracking URLs
2. **Refund Sync** — Track partial/full refunds with line-item detail
3. **Order Timeline** — Show complete order lifecycle (created → paid → fulfilled → delivered)
4. **Order Notes Sync** — Bidirectional note sync between Eagle and Shopify
5. **Order Tags Sync** — Sync order tags for categorization and filtering
6. **Multi-Currency** — Proper multi-currency handling with presentment prices
7. **Order Risk Assessment** — Sync Shopify fraud analysis data
8. **Shipping Rates** — Display shipping method and cost breakdown
9. **Order Edit History** — Track order modifications and adjustments
10. **Reorder Functionality** — One-click reorder from previous order details

### Files Modified
- `backend/prisma/schema.prisma` — Expand OrderLocal model
- `backend/src/sync/workers/orders-sync.worker.ts` — Enhance order data sync
- `backend/src/webhooks/handlers/orders.handler.ts` — Handle fulfillment webhooks
- `accounts/app/orders/[id]/page.tsx` — Rich order detail with timeline
- `admin/app/orders/[id]/page.tsx` — Admin order view with full detail

---

## 🔵 PHASE 5: Smart Offers & Personalization Engine

### Current State
- PricingRules for B2B pricing
- Missing: personalized offers, recommendation engine, win-back campaigns

### 10 New Features
1. **Personalized Offers** — Auto-generate offers based on purchase history
2. **Product Recommendations** — "Customers also bought" based on order data
3. **Win-Back Campaigns** — Auto-target churning customers with special deals
4. **Abandoned Cart Recovery** — Enhanced recovery with progressive discounts
5. **Loyalty Points** — Points system based on order value, tracked in Shopify metafields
6. **VIP Tier System** — Bronze/Silver/Gold/Platinum based on total spend
7. **Birthday/Anniversary Offers** — Auto-send offers on customer milestones
8. **Cross-Sell Engine** — Suggest complementary products at checkout
9. **Bulk Quote Requests** — Allow B2B customers to request quotes for large orders
10. **Welcome Series** — Progressive onboarding offers for new customers

### Files Modified
- `backend/prisma/schema.prisma` — Add Offer, LoyaltyPoint models
- `backend/src/offers/` — New offers module
- `admin/app/campaigns/page.tsx` — Campaign management
- `accounts/app/dashboard/page.tsx` — Show personalized offers

---

## 🟣 PHASE 6: Admin Dashboard & Analytics Enhancement

### Current State
- Basic stats: companies, users, orders, revenue, products, avg order value
- Missing: Shopify analytics, real-time metrics, conversion funnels, cohort analysis

### 10 New Features
1. **Revenue Trend Chart** — Daily/weekly/monthly revenue with comparison periods
2. **Conversion Funnel** — Visit → PDP → Cart → Checkout → Order conversion rates
3. **Cohort Analysis** — Retention by signup month, purchase frequency over time
4. **Top Products Dashboard** — Most viewed, most purchased, highest revenue products
5. **Customer Acquisition** — New vs returning customer metrics with trends
6. **Inventory Alerts** — Low stock, out of stock, and overstock notifications
7. **Discount ROI** — Revenue and margin impact of each discount code
8. **Geographic Analysis** — Order distribution by city/country with map view
9. **Sync Health Dashboard** — Visual sync status with error alerts and auto-retry
10. **Real-Time Activity Feed** — Live websocket feed of orders, events, logins

### Files Modified
- `admin/app/dashboard/page.tsx` — Enhanced dashboard with charts
- `admin/app/analytics/` — Deep analytics pages
- `admin/app/reports/page.tsx` — Report generation
- `backend/src/analytics/analytics.service.ts` — New analytics aggregation

---

## Implementation Priority (Batch Approach)

### Batch 1 (NOW): Product Sync + Customer Intelligence
- Expand GraphQL queries for richer product data
- Add product metafields, collections, reviews, media to schema
- Add CLV, RFM, health score calculation
- Enhance product detail page with all Shopify data
- Enhanced admin customer list with insights

### Batch 2: Order Intelligence + Discount Sync
- Enhanced order detail pages
- Fulfillment tracking + refund sync
- Discount code sync from Shopify
- Discount analytics

### Batch 3: Smart Offers + Analytics
- Personalized offer engine
- Product recommendations
- VIP tier system
- Enhanced dashboard with charts
