'use client';

import { useState, useEffect } from 'react';
import { accountsFetch } from '@/lib/api-client';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';
import { WelcomeBanner, DashboardStatsCards, QuickActionsPanel, SavingsHighlight } from '@/components/dashboard/WelcomeBanner';
import { PageLoading, EmptyState } from '@/components/ui';
import type { Order } from '@eagle/types';

interface DashboardStats {
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
  cartItems: number;
  savings: number;
}

export default function AccountsDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
    cartItems: 0,
    savings: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('eagle_companyId') || '';
      const userEmail = localStorage.getItem('eagle_userEmail') || '';
      
      const [ordersData, companyData, cartData, userData] = await Promise.all([
        accountsFetch('/api/v1/orders').then(r => r.json()).catch(() => []),
        accountsFetch(`/api/v1/companies/${companyId}`).then(r => r.json()).catch(() => null),
        accountsFetch('/api/v1/carts/active').then(r => r.json()).catch(() => null),
        accountsFetch('/api/v1/company-users/me').then(r => r.json()).catch(() => null),
      ]);
      
      setCompanyName(companyData?.name || 'Your Company');
      setUserName(userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : userEmail.split('@')[0] || 'there');
      setRecentOrders(Array.isArray(ordersData) ? ordersData.slice(0, 5) : []);
      
      // Calculate stats
      interface OrderData {
        financialStatus: string;
        totalPrice?: string | number;
      }
      
      const orders = Array.isArray(ordersData) ? ordersData as OrderData[] : [];
      const pending = orders.filter(o => o.financialStatus === 'pending').length;
      const completed = orders.filter(o => o.financialStatus === 'paid').length;
      const total = orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
      
      // Calculate savings (placeholder - would come from API in production)
      const estimatedSavings = total * 0.15; // Assume 15% B2B discount
      
      setStats({
        pendingOrders: pending,
        completedOrders: completed,
        totalSpent: total,
        cartItems: cartData?.items?.length || 0,
        savings: estimatedSavings,
      });
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading text="Loading your dashboard..." />;
  }

  return (
    <div>
      {/* Welcome Banner */}
      <WelcomeBanner
        userName={userName}
        companyName={companyName}
        stats={{
          orders: {
            total: stats.pendingOrders + stats.completedOrders,
            pending: stats.pendingOrders,
            completed: stats.completedOrders,
            thisMonth: stats.completedOrders,
          },
          spending: {
            total: stats.totalSpent,
            thisMonth: stats.totalSpent,
            lastMonth: 0,
            savings: stats.savings,
          },
          cart: {
            itemCount: stats.cartItems,
            total: 0,
          },
          credit: {
            limit: 100000,
            used: stats.totalSpent,
            available: 100000 - stats.totalSpent,
          },
        }}
      />

      {/* Savings Highlight */}
      {stats.savings > 0 && (
        <SavingsHighlight
          totalSavings={stats.savings}
          savingsThisMonth={stats.savings}
          discountTier="B2B Partner"
        />
      )}

      {/* Quick Stats Cards */}
      <DashboardStatsCards stats={stats} />

      {/* Quick Actions */}
      <QuickActionsPanel 
        cartItemCount={stats.cartItems}
        pendingApprovals={0}
      />

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">Recent Orders</h3>
          <Link href="/orders" className="btn-apple btn-apple-primary" style={{ height: 34, fontSize: 13 }}>View All</Link>
        </div>
        <div className="card-body">
          {recentOrders.length === 0 ? (
            <EmptyState
              icon="ti-package"
              title="No orders yet"
              description="Start shopping to see your orders here!"
              action={{
                label: 'Browse Products',
                onClick: () => window.location.href = '/products',
              }}
            />
          ) : (
            <div className="table-container">
              <table className="apple-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/orders/${order.id}`} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                          #{order.orderNumber || order.shopifyOrderNumber}
                        </Link>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {formatRelativeTime(order.createdAt)}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(order.totalPrice)}
                      </td>
                      <td>
                        <OrderStatusBadge status={order.financialStatus} />
                      </td>
                      <td>
                        <Link href={`/orders/${order.id}`} className="btn-apple btn-apple-secondary" style={{ height: 30, fontSize: 12, textDecoration: 'none' }}>
                          <i className="ti ti-eye" style={{ marginRight: 4, fontSize: 14 }}></i>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Order Status Badge Component
function OrderStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: 'var(--orange)', label: 'Pending' },
    paid: { color: 'var(--green)', label: 'Paid' },
    fulfilled: { color: 'var(--accent)', label: 'Shipped' },
    delivered: { color: 'var(--green)', label: 'Delivered' },
    cancelled: { color: 'var(--red)', label: 'Cancelled' },
    refunded: { color: 'var(--text-tertiary)', label: 'Refunded' },
  };

  const config = statusConfig[status?.toLowerCase()] || { color: 'var(--text-tertiary)', label: status };

  return (
    <span className="badge" style={{ background: `${config.color}18`, color: config.color }}>
      {config.label}
    </span>
  );
}
