'use client';

import { formatCurrency, formatNumber } from '@/lib/utils';
import type { EnhancedDashboardStats, Promotion } from '@/types';
import Link from 'next/link';

// ============================================
// WELCOME BANNER
// ============================================

interface WelcomeBannerProps {
  userName: string;
  companyName: string;
  stats?: EnhancedDashboardStats;
  activePromotions?: Promotion[];
  isFirstLogin?: boolean;
}

export function WelcomeBanner({
  userName,
  companyName,
  stats,
  activePromotions = [],
  isFirstLogin = false,
}: WelcomeBannerProps) {
  const firstName = userName.split(' ')[0] || 'there';
  const greeting = getGreeting();

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,131,255,0.2), rgba(167,139,250,0.15))', border: '1px solid rgba(99,131,255,0.15)', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
      <div className="card-body">
        {/* Welcome Message */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '2 1 60%', minWidth: '300px' }}>
            <h4 className="card-title" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {greeting}, {firstName}! 👋
            </h4>
            <p style={{ marginBottom: '0.75rem' }}>
              {isFirstLogin ? (
                <>Welcome to <strong>{companyName}</strong>! Your B2B account is ready. Explore your personalized pricing below.</>
              ) : (
                <>Welcome back to <strong>{companyName}</strong> portal. Your exclusive pricing is active.</>
              )}
            </p>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <QuickActionButton
                href="/products"
                icon="ti-shopping-cart"
                label="Browse Products"
              />
              <QuickActionButton
                href="/orders"
                icon="ti-list"
                label="My Orders"
              />
              <QuickActionButton
                href="/cart"
                icon="ti-shopping-bag"
                label="View Cart"
                badge={stats?.cart?.itemCount}
              />
            </div>

            {/* Active Promotions */}
            {activePromotions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                <span className="badge" style={{ background: 'var(--orange)', color: '#1d1d1f' }}>
                  <i className="ti ti-tag" style={{ marginRight: '0.25rem' }}></i>
                  Active Deals
                </span>
                {activePromotions.slice(0, 2).map((promo) => (
                  <span key={promo.id} className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {promo.discountType === 'percentage'
                      ? `${promo.discountValue}% OFF`
                      : `$${promo.discountValue} OFF`}
                    {promo.minQuantity && ` on ${promo.minQuantity}+ items`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div style={{ flex: '1 1 30%', minWidth: '200px', marginTop: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <StatCard
                label="This Month"
                value={formatCurrency(stats?.spending?.thisMonth || 0)}
                icon="ti-chart-bar"
              />
              <StatCard
                label="Savings"
                value={formatCurrency(stats?.spending?.savings || 0)}
                icon="ti-discount"
                variant="success"
              />
              <StatCard
                label="Orders"
                value={formatNumber(stats?.orders?.total || 0)}
                icon="ti-package"
              />
              <StatCard
                label="Credit"
                value={formatCurrency(stats?.credit?.available || 0)}
                icon="ti-credit-card"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// QUICK ACTION BUTTON
// ============================================

interface QuickActionButtonProps {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

function QuickActionButton({ href, icon, label, badge }: QuickActionButtonProps) {
  return (
    <Link href={href} className="btn-apple btn-apple-secondary" style={{ position: 'relative' }}>
      <i className={`ti ${icon}`} style={{ marginRight: '0.25rem' }}></i>
      {label}
      {badge && badge > 0 && (
        <span className="badge" style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--red)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
          {badge}
        </span>
      )}
    </Link>
  );
}

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  variant?: 'default' | 'success' | 'warning';
}

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const bgColor = variant === 'success'
    ? 'rgba(52, 199, 89, 0.25)'
    : variant === 'warning'
      ? 'rgba(255, 149, 0, 0.25)'
      : 'rgba(255, 255, 255, 0.1)';

  return (
    <div>
      <div style={{ borderRadius: '0.75rem', padding: '0.5rem', background: bgColor }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <i className={`ti ${icon}`} style={{ marginRight: '0.5rem' }}></i>
          <div>
            <small style={{ display: 'block', opacity: 0.75 }}>{label}</small>
            <strong>{value}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// DASHBOARD STATS CARDS
// ============================================

interface DashboardStatsCardsProps {
  stats: {
    pendingOrders: number;
    completedOrders: number;
    totalSpent: number;
    cartItems: number;
    savings?: number;
  };
}

export function DashboardStatsCards({ stats }: DashboardStatsCardsProps) {
  return (
    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
      <div>
        <StatsCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon="ti-clock"
          variant="warning"
        />
      </div>
      <div>
        <StatsCard
          title="Completed Orders"
          value={stats.completedOrders}
          icon="ti-check"
          variant="success"
        />
      </div>
      <div>
        <StatsCard
          title="Total Spent"
          value={formatCurrency(stats.totalSpent)}
          icon="ti-currency-dollar"
          variant="info"
        />
      </div>
      <div>
        <StatsCard
          title="Total Savings"
          value={formatCurrency(stats.savings || 0)}
          icon="ti-discount"
          variant="primary"
          subtitle="From B2B pricing"
        />
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  variant: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  subtitle?: string;
}

function StatsCard({ title, value, icon, variant, subtitle }: StatsCardProps) {
  const variantColors: Record<string, { bg: string; fg: string }> = {
    primary: { bg: 'rgba(0, 122, 255, 0.12)', fg: 'var(--accent)' },
    success: { bg: 'rgba(52, 199, 89, 0.12)', fg: 'var(--green)' },
    warning: { bg: 'rgba(255, 149, 0, 0.12)', fg: 'var(--orange)' },
    info: { bg: 'rgba(90, 200, 250, 0.12)', fg: 'var(--accent)' },
    danger: { bg: 'rgba(255, 59, 48, 0.12)', fg: 'var(--red)' },
  };
  const colors = variantColors[variant] || variantColors.primary;

  return (
    <div className="stat-card card" style={{ height: '100%' }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="stat-info">
            <p className="stat-label" style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>{title}</p>
            <h4 className="stat-value" style={{ marginBottom: 0 }}>{value}</h4>
            {subtitle && <small style={{ color: 'var(--text-secondary)' }}>{subtitle}</small>}
          </div>
          <span className="stat-icon badge" style={{ background: colors.bg, color: colors.fg, borderRadius: '0.75rem', padding: '0.5rem' }}>
            <i className={`ti ${icon} ti-sm`}></i>
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// QUICK ACTIONS PANEL
// ============================================

interface QuickActionsPanelProps {
  cartItemCount?: number;
  pendingApprovals?: number;
}

export function QuickActionsPanel({ cartItemCount = 0, pendingApprovals = 0 }: QuickActionsPanelProps) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-header">
        <h5 className="card-title" style={{ marginBottom: 0 }}>Quick Actions</h5>
      </div>
      <div className="card-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          <div>
            <Link href="/products" className="btn-apple btn-apple-secondary" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0.5rem' }}>
              <i className="ti ti-search ti-lg" style={{ marginBottom: '0.5rem' }}></i>
              <span>Browse Products</span>
            </Link>
          </div>
          <div>
            <Link href="/cart" className="btn-apple btn-apple-secondary" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0.5rem', position: 'relative' }}>
              <i className="ti ti-shopping-cart ti-lg" style={{ marginBottom: '0.5rem' }}></i>
              <span>View Cart</span>
              {cartItemCount > 0 && (
                <span className="badge" style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--red)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
          <div>
            <Link href="/orders" className="btn-apple btn-apple-secondary" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0.5rem' }}>
              <i className="ti ti-list-check ti-lg" style={{ marginBottom: '0.5rem' }}></i>
              <span>Order History</span>
            </Link>
          </div>
          <div>
            <Link href="/quotes" className="btn-apple btn-apple-secondary" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0.5rem', position: 'relative' }}>
              <i className="ti ti-file-text ti-lg" style={{ marginBottom: '0.5rem' }}></i>
              <span>Request Quote</span>
              {pendingApprovals > 0 && (
                <span className="badge" style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--orange)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                  {pendingApprovals}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SAVINGS HIGHLIGHT
// ============================================

interface SavingsHighlightProps {
  totalSavings: number;
  savingsThisMonth: number;
  discountTier?: string;
}

export function SavingsHighlight({ totalSavings, savingsThisMonth, discountTier }: SavingsHighlightProps) {
  if (totalSavings <= 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '0.75rem', border: '1px solid var(--green)' }} role="alert">
      <i className="ti ti-discount ti-lg" style={{ marginRight: '0.75rem', color: 'var(--green)' }}></i>
      <div style={{ flexGrow: 1 }}>
        <strong>You&apos;re saving with B2B pricing!</strong>
        <div style={{ fontSize: '0.8125rem' }}>
          Total savings: <strong>{formatCurrency(totalSavings)}</strong>
          {savingsThisMonth > 0 && (
            <> • This month: <strong>{formatCurrency(savingsThisMonth)}</strong></>
          )}
          {discountTier && (
            <> • Your tier: <span className="badge" style={{ background: 'var(--green)', color: '#fff', marginLeft: '0.25rem' }}>{discountTier}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// ============================================
// EXPORTS
// ============================================

export default WelcomeBanner;
