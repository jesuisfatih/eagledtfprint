'use client';

import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';

// Types
interface SpendingData {
  period: string;
  amount: number;
  orderCount: number;
}

interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent?: number;
}

interface TopProduct {
  productId: string;
  title: string;
  image?: string;
  quantity: number;
  totalSpent: number;
  orderCount: number;
}

interface AnalyticsSummary {
  totalSpent: number;
  totalOrders: number;
  averageOrderValue: number;
  totalSavings: number;
  periodChange: number;
}

// Main Analytics Dashboard
interface SpendingAnalyticsDashboardProps {
  summary: AnalyticsSummary;
  monthlyData: SpendingData[];
  categoryBreakdown: CategorySpend[];
  topProducts: TopProduct[];
  period?: 'month' | 'quarter' | 'year';
  onPeriodChange?: (period: 'month' | 'quarter' | 'year') => void;
}

export function SpendingAnalyticsDashboard({
  summary,
  monthlyData,
  categoryBreakdown,
  topProducts,
  period = 'month',
  onPeriodChange
}: SpendingAnalyticsDashboardProps) {
  return (
    <div className="spending-analytics-dashboard">
      {/* Period Selector */}
      {onPeriodChange && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {(['month', 'quarter', 'year'] as const).map(p => (
              <button
                key={p}
                className={period === p ? 'btn-apple btn-apple-primary' : 'btn-apple btn-apple-secondary'}
                onClick={() => onPeriodChange(p)}
              >
                {p === 'month' ? 'This Month' : p === 'quarter' ? 'This Quarter' : 'This Year'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 24 }}>
        <SummaryCard
          title="Total Spent"
          value={formatCurrency(summary.totalSpent)}
          change={summary.periodChange}
          icon="wallet"
          color="primary"
        />
        <SummaryCard
          title="Total Orders"
          value={formatNumber(summary.totalOrders)}
          icon="shopping-cart"
          color="info"
        />
        <SummaryCard
          title="Average Order"
          value={formatCurrency(summary.averageOrderValue)}
          icon="receipt"
          color="warning"
        />
        <SummaryCard
          title="Total Savings"
          value={formatCurrency(summary.totalSavings)}
          icon="discount"
          color="success"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Spending Chart */}
        <SpendingChart data={monthlyData} />

        {/* Category Breakdown */}
        <CategoryBreakdown categories={categoryBreakdown} />

        {/* Top Products */}
        <div style={{ gridColumn: '1 / -1' }}>
          <TopProductsTable products={topProducts} />
        </div>
      </div>
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: string;
  change?: number;
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'info' | 'danger';
}

export function SummaryCard({ title, value, change, icon, color }: SummaryCardProps) {
  const colorMap: Record<string, string> = {
    primary: 'var(--accent)', success: 'var(--green)', warning: 'var(--orange)',
    info: 'var(--accent)', danger: 'var(--red)',
  };
  const c = colorMap[color] || 'var(--accent)';

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{title}</p>
            <h3 style={{ margin: 0 }}>{value}</h3>
            {change !== undefined && (
              <small style={{ color: change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                <i className={`ti ti-trending-${change >= 0 ? 'up' : 'down'}`} style={{ marginRight: 4 }}></i>
                {formatPercent(Math.abs(change))} vs last period
              </small>
            )}
          </div>
          <div 
            style={{ 
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className={`ti ti-${icon}`} style={{ fontSize: 20, color: c }}></i>
          </div>
        </div>
      </div>
    </div>
  );
}

// Spending Chart (Simple bar representation)
interface SpendingChartProps {
  data: SpendingData[];
}

export function SpendingChart({ data }: SpendingChartProps) {
  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <h6 style={{ margin: 0 }}>
          <i className="ti ti-chart-bar" style={{ marginRight: 8 }}></i>
          Spending Over Time
        </h6>
      </div>
      <div className="card-body">
        {data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            <i className="ti ti-chart-off ti-2x" style={{ marginBottom: 8, display: 'block' }}></i>
            <p style={{ margin: 0 }}>No spending data available</p>
          </div>
        ) : (
          <div className="spending-chart">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 200 }}>
              {data.map((item, index) => {
                const height = (item.amount / maxAmount) * 100;
                return (
                  <div 
                    key={index} 
                    style={{ textAlign: 'center', flex: 1, padding: '0 4px', maxWidth: `${100 / data.length}%` }}
                  >
                    <div 
                      style={{ 
                        background: 'var(--accent)',
                        borderRadius: '4px 4px 0 0',
                        margin: '0 auto',
                        position: 'relative',
                        height: `${Math.max(height, 5)}%`, 
                        minHeight: 10,
                        maxWidth: 40,
                        transition: 'height 0.3s ease'
                      }}
                      title={`${item.period}: ${formatCurrency(item.amount)}`}
                    >
                      <div 
                        style={{ position: 'absolute', width: '100%', textAlign: 'center', top: -20 }}
                      >
                        <small style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
                          {formatCurrency(item.amount)}
                        </small>
                      </div>
                    </div>
                    <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 8, fontSize: 11 }}>
                      {item.period}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Category Breakdown
interface CategoryBreakdownProps {
  categories: CategorySpend[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const colors = ['var(--accent)', 'var(--green)', 'var(--orange)', 'var(--accent)', 'var(--red)', 'var(--text-tertiary)'];

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <h6 style={{ margin: 0 }}>
          <i className="ti ti-category" style={{ marginRight: 8 }}></i>
          Spending by Category
        </h6>
      </div>
      <div className="card-body">
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>No category data</p>
          </div>
        ) : (
          <div>
            {categories.map((cat, index) => (
              <div key={cat.category} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                    {cat.category}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {formatCurrency(cat.amount)}
                    {cat.trend !== 'stable' && (
                      <i className={`ti ti-arrow-${cat.trend === 'up' ? 'up' : 'down'}`} style={{ marginLeft: 4, fontSize: 13, color: cat.trend === 'up' ? 'var(--green)' : 'var(--red)' }}></i>
                    )}
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', borderRadius: 4,
                      width: `${cat.percentage}%`,
                      background: colors[index % colors.length],
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Top Products Table
interface TopProductsTableProps {
  products: TopProduct[];
  maxItems?: number;
}

export function TopProductsTable({ products, maxItems = 5 }: TopProductsTableProps) {
  const displayProducts = products.slice(0, maxItems);

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h6 style={{ margin: 0 }}>
          <i className="ti ti-star" style={{ marginRight: 8 }}></i>
          Most Purchased Products
        </h6>
        {products.length > maxItems && (
          <a href="/products" className="btn-apple btn-apple-secondary">
            View All
          </a>
        )}
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {displayProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>No purchase history</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'center' }}>Times Ordered</th>
                  <th style={{ textAlign: 'center' }}>Total Qty</th>
                  <th style={{ textAlign: 'right' }}>Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {displayProducts.map((product, index) => (
                  <tr key={product.productId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', marginRight: 8 }}>{index + 1}</span>
                        {product.image && (
                          <img 
                            src={product.image} 
                            alt={product.title}
                            style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, marginRight: 8 }}
                          />
                        )}
                        <span style={{ fontWeight: 600 }}>{product.title}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {product.orderCount} order{product.orderCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{formatNumber(product.quantity)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(product.totalSpent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Savings Summary Widget
interface SavingsSummaryProps {
  totalSavings: number;
  savingsBreakdown: Array<{
    type: string;
    amount: number;
  }>;
}

export function SavingsSummary({ totalSavings, savingsBreakdown }: SavingsSummaryProps) {
  return (
    <div className="card" style={{ background: 'var(--green)', color: '#fff' }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ marginBottom: 4, opacity: 0.75 }}>Total Savings</p>
            <h3 style={{ margin: 0 }}>{formatCurrency(totalSavings)}</h3>
          </div>
          <div 
            style={{ 
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-discount-2" style={{ fontSize: 24 }}></i>
          </div>
        </div>
        
        {savingsBreakdown.length > 0 && (
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.25)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {savingsBreakdown.map(item => (
                <div key={item.type}>
                  <small style={{ opacity: 0.75 }}>{item.type}</small>
                  <div style={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Stats Row
interface QuickStat {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}

interface QuickStatsRowProps {
  stats: QuickStat[];
}

export function QuickStatsRow({ stats }: QuickStatsRowProps) {
  const colorMap: Record<string, string> = {
    primary: 'var(--accent)', success: 'var(--green)', warning: 'var(--orange)',
    info: 'var(--accent)', danger: 'var(--red)',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 16 }}>
      {stats.map((stat, index) => {
        const c = colorMap[stat.color || 'primary'] || 'var(--accent)';
        return (
          <div key={index}>
            <div className="card" style={{ height: '100%' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center' }}>
                <div 
                  style={{ 
                    width: 44, height: 44, borderRadius: 10,
                    background: 'var(--bg-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <i className={`ti ti-${stat.icon}`} style={{ fontSize: 20, color: c }}></i>
                </div>
                <div>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13 }}>{stat.label}</p>
                  <h5 style={{ margin: 0 }}>{stat.value}</h5>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Order Frequency Chart
interface OrderFrequencyProps {
  weeklyOrders: number[];
  labels?: string[];
}

export function OrderFrequencyChart({ weeklyOrders, labels }: OrderFrequencyProps) {
  const defaultLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const displayLabels = labels || defaultLabels;
  const maxOrders = Math.max(...weeklyOrders, 1);

  return (
    <div className="card">
      <div className="card-header">
        <h6 style={{ margin: 0 }}>
          <i className="ti ti-calendar-stats" style={{ marginRight: 8 }}></i>
          Order Frequency
        </h6>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 }}>
          {weeklyOrders.map((count, index) => {
            const height = (count / maxOrders) * 100;
            return (
              <div key={index} style={{ textAlign: 'center', flex: 1 }}>
                <div 
                  style={{ 
                    background: 'var(--accent)',
                    opacity: 0.75,
                    borderRadius: '4px 4px 0 0',
                    margin: '0 auto',
                    height: `${Math.max(height, 5)}%`,
                    minHeight: count > 0 ? 10 : 4,
                    width: 24,
                    transition: 'height 0.3s ease'
                  }}
                  title={`${count} orders`}
                ></div>
                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 8 }}>{displayLabels[index]}</small>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
