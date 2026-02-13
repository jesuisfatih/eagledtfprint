'use client';

import {
    DataTable,
    type DataTableColumn,
    PageContent,
    PageHeader,
    StatsCard,
    StatusBadge,
    showToast
} from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import type { OrderWithItems } from '@/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    revenue: 0,
    refunded: 0,
    fulfilled: 0,
    fulfillmentRate: '0',
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const [ordersRes, statsRes] = await Promise.all([
        adminFetch('/api/v1/orders'),
        adminFetch('/api/v1/orders/stats').catch(() => null),
      ]);
      const orderList = await ordersRes.json();
      const data = Array.isArray(orderList) ? orderList : [];
      setOrders(data);

      if (statsRes?.ok) {
        const s = await statsRes.json();
        setStats({
          total: s.total || data.length,
          pending: data.filter((o: any) => o.paymentStatus === 'pending').length,
          paid: data.filter((o: any) => o.paymentStatus === 'paid').length,
          revenue: Number(s.totalRevenue || data.reduce((sum: number, o: any) => sum + Number(o.totalPrice || 0), 0)),
          refunded: Number(s.totalRefunded || 0),
          fulfilled: s.fulfilledCount || data.filter((o: any) => o.fulfillmentStatus === 'fulfilled').length,
          fulfillmentRate: s.fulfillmentRate || '0',
        });
      } else {
        setStats({
          total: data.length,
          pending: data.filter((o: any) => o.paymentStatus === 'pending').length,
          paid: data.filter((o: any) => o.paymentStatus === 'paid').length,
          revenue: data.reduce((sum: number, o: any) => sum + Number(o.totalPrice || 0), 0),
          refunded: 0,
          fulfilled: data.filter((o: any) => o.fulfillmentStatus === 'fulfilled').length,
          fulfillmentRate: '0',
        });
      }
    } catch (err) {
      console.error('Load orders error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = 'Order,Company,Total,Payment,Fulfillment,Risk,Shipping,Refunded,Date\n' + orders.map(o =>
      `${o.orderNumber},${(o as any).company?.name || 'N/A'},${o.totalPrice},${o.paymentStatus},${o.fulfillmentStatus},${(o as any).riskLevel || 'normal'},${(o as any).totalShipping || 0},${(o as any).totalRefunded || 0},${new Date(o.createdAt).toLocaleDateString()}`
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Orders exported successfully!', 'success');
  };

  const riskBadge = (risk: string) => {
    const colors: Record<string, string> = { low: 'success', normal: 'secondary', medium: 'warning', high: 'danger' };
    return risk && risk !== 'normal' ? (
      <StatusBadge status={risk} colorMap={colors} />
    ) : null;
  };

  const columns: DataTableColumn<OrderWithItems>[] = [
    {
      key: 'orderNumber',
      label: 'Order ID',
      sortable: true,
      render: (order) => (
        <Link href={`/orders/${order.id}`} style={{ fontWeight: 500, color: 'var(--accent-primary)', textDecoration: 'none' }}>
          #{order.orderNumber}
        </Link>
      ),
    },
    { key: 'company', label: 'Company', sortable: true, render: (order) => order.company?.name || 'N/A' },
    { key: 'createdAt', label: 'Date', sortable: true, render: (order) => new Date(order.createdAt).toLocaleDateString() },
    { key: 'totalPrice', label: 'Total', sortable: true, render: (order) => `$${Number(order.totalPrice || 0).toFixed(2)}` },
    {
      key: 'paymentStatus', label: 'Payment', sortable: true,
      render: (order) => <StatusBadge status={order.paymentStatus} colorMap={{ paid: 'success', pending: 'warning', refunded: 'info', failed: 'danger' }} />,
    },
    {
      key: 'fulfillmentStatus', label: 'Fulfillment', sortable: true,
      render: (order) => <StatusBadge status={order.fulfillmentStatus} colorMap={{ fulfilled: 'success', partial: 'warning', unfulfilled: 'secondary' }} />,
    },
    {
      key: 'riskLevel' as any, label: 'Risk', sortable: true,
      render: (order: any) => riskBadge(order.riskLevel) || <span style={{ color: 'var(--text-tertiary)' }}>—</span>,
    },
  ];

  const rowActions = (order: OrderWithItems) => (
    <div style={{ display: 'flex', gap: 6 }}>
      <Link href={`/orders/${order.id}`} className="btn-apple ghost small" style={{ textDecoration: 'none' }}>
        <i className="ti ti-eye" />
      </Link>
      {order.shopifyOrderId && (
        <a href={`https://admin.shopify.com/store/eagledtfsupply/orders/${order.shopifyOrderId}`}
          target="_blank" rel="noopener noreferrer" className="btn-apple ghost small" title="View in Shopify">
          <i className="ti ti-external-link" />
        </a>
      )}
    </div>
  );

  const fmtRevenue = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${orders.length} total orders`}
        actions={[
          { label: 'Export CSV', icon: 'download', variant: 'success', onClick: exportCSV },
          { label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: loadOrders },
        ]}
      />

      <div className="stats-grid">
        <StatsCard title="Total Orders" value={stats.total} icon="shopping-cart" iconColor="primary" loading={loading} />
        <StatsCard title="Revenue" value={fmtRevenue(stats.revenue)} icon="currency-dollar" iconColor="success" loading={loading} />
        <StatsCard title="Paid" value={stats.paid} icon="check" iconColor="success" loading={loading} />
        <StatsCard title="Pending" value={stats.pending} icon="clock" iconColor="warning" loading={loading} />
        <StatsCard title="Fulfilled" value={`${stats.fulfilled} (${stats.fulfillmentRate}%)`} icon="package" iconColor="info" loading={loading} />
        <StatsCard title="Refunded" value={fmtRevenue(stats.refunded)} icon="arrow-back" iconColor="danger" loading={loading} />
      </div>

      <div style={{ marginTop: 20 }}>
        <PageContent
          loading={loading}
          empty={{ show: !loading && orders.length === 0, icon: 'shopping-cart', title: 'No orders yet', message: 'Orders will appear here after customers make purchases.' }}
        >
          <DataTable
            data={orders as any}
            columns={columns as any}
            loading={loading}
            searchable
            searchPlaceholder="Search orders..."
            searchFields={['orderNumber', 'company.name', 'email']}
            statusFilter={{
              field: 'paymentStatus',
              options: [
                { value: 'paid', label: 'Paid' },
                { value: 'pending', label: 'Pending' },
                { value: 'refunded', label: 'Refunded' },
                { value: 'failed', label: 'Failed' },
              ],
            }}
            defaultSortKey="createdAt"
            defaultSortOrder="desc"
            rowActions={rowActions as any}
            onRowClick={(order: any) => window.location.href = `/orders/${order.id}`}
          />
        </PageContent>
      </div>
    </div>
  );
}
