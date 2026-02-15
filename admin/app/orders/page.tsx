'use client';

import {
    DataTable,
    type DataTableColumn,
    PageContent,
    PageHeader,
    StatsCard,
    StatusBadge,
    Tabs,
    showToast
} from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import type { OrderWithItems } from '@/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    revenue: 0,
    refunded: 0,
    fulfilled: 0,
    fulfillmentRate: '0',
    pickupCount: 0,
  });

  useEffect(() => {
    loadOrders();
  }, [activeFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeFilter === 'pickup') params.set('pickupOnly', 'true');
      if (activeFilter === 'design_files') params.set('hasDesignFiles', 'true');

      const [ordersRes, statsRes] = await Promise.all([
        adminFetch(`/api/v1/orders?${params.toString()}`),
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
          pickupCount: s.pickupCount || 0,
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
          pickupCount: data.filter((o: any) => o.isPickup).length,
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
    const csv = 'Order,Company,Total,Payment,Fulfillment,Risk,Pickup,DesignFiles,Shipping,Refunded,Date\n' + orders.map(o =>
      `${o.orderNumber},${(o as any).company?.name || 'N/A'},${o.totalPrice},${o.paymentStatus},${o.fulfillmentStatus},${(o as any).riskLevel || 'normal'},${(o as any).isPickup ? 'Yes' : 'No'},${(o as any).hasDesignFiles ? 'Yes' : 'No'},${(o as any).totalShipping || 0},${(o as any).totalRefunded || 0},${new Date(o.createdAt).toLocaleDateString()}`
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

  const filterButtons = [
    { key: 'all', label: 'All Orders', icon: 'list', count: stats.total },
    { key: 'pickup', label: 'Pickup', icon: 'map-pin', count: stats.pickupCount },
    { key: 'design_files', label: 'With Files', icon: 'file-upload', count: orders.filter((o: any) => o.hasDesignFiles).length },
  ];

  const columns: DataTableColumn<OrderWithItems>[] = [
    {
      key: 'orderNumber',
      label: 'Order',
      sortable: true,
      render: (order: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={`/orders/${order.id}`} style={{ fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}>
            #{order.orderNumber}
          </Link>
          {order.isPickup && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              background: 'rgba(255,149,0,0.12)', color: '#ff9500',
            }}>
              <i className="ti ti-map-pin" style={{ fontSize: 10 }} />PICKUP
            </span>
          )}
          {order.hasDesignFiles && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              background: 'rgba(88,86,214,0.12)', color: '#5856d6',
            }}>
              <i className="ti ti-file" style={{ fontSize: 10 }} />{order.designFiles?.length}
            </span>
          )}
        </div>
      ),
    },
    { key: 'company' as any, label: 'Company', sortable: true, render: (order: any) => order.company?.name || '—' },
    { key: 'createdAt', label: 'Date', sortable: true, render: (order) => new Date(order.createdAt).toLocaleDateString() },
    { key: 'totalPrice', label: 'Total', sortable: true, render: (order) => `$${Number(order.totalPrice || 0).toFixed(2)}` },
    {
      key: 'paymentStatus', label: 'Payment', sortable: true,
      render: (order) => <StatusBadge status={order.paymentStatus} colorMap={{ paid: 'success', pending: 'warning', refunded: 'info', failed: 'danger' }} />,
    },
    {
      key: 'fulfillmentStatus', label: 'Fulfillment', sortable: true,
      render: (order: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge status={order.fulfillmentStatus} colorMap={{ fulfilled: 'success', partial: 'warning', unfulfilled: 'secondary' }} />
          {order.pickupOrder && (
            <Link href={`/pickup`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              background: order.pickupOrder.status === 'picked_up' ? 'rgba(52,199,89,0.12)' :
                         order.pickupOrder.status === 'ready' ? 'rgba(0,122,255,0.12)' : 'rgba(255,149,0,0.12)',
              color: order.pickupOrder.status === 'picked_up' ? '#34c759' :
                     order.pickupOrder.status === 'ready' ? '#007aff' : '#ff9500',
              textDecoration: 'none',
            }}>
              {order.pickupOrder.shelfCode && <span>📍{order.pickupOrder.shelfCode}</span>}
              {order.pickupOrder.status.replace(/_/g, ' ')}
            </Link>
          )}
        </div>
      ),
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
      {(order as any).isPickup && (
        <Link href="/pickup" className="btn-apple ghost small" style={{ textDecoration: 'none' }} title="View Pickup">
          <i className="ti ti-map-pin" />
        </Link>
      )}
      {order.shopifyOrderId && (
        <a href={`${config.shopifyAdminBaseUrl}/orders/${order.shopifyOrderId}`}
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
        subtitle={`${orders.length} ${activeFilter !== 'all' ? `${activeFilter} ` : ''}orders`}
        actions={[
          { label: 'Export CSV', icon: 'download', variant: 'success', onClick: exportCSV },
          { label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: loadOrders },
        ]}
      />

      {/* Filter tabs */}
      <Tabs
        tabs={filterButtons.map(f => ({ id: f.key, label: f.label, icon: f.icon, count: f.count }))}
        active={activeFilter}
        onChange={setActiveFilter}
      />

      <div className="stats-grid">
        <StatsCard title="Total Orders" value={stats.total} icon="shopping-cart" iconColor="primary" loading={loading} />
        <StatsCard title="Revenue" value={fmtRevenue(stats.revenue)} icon="currency-dollar" iconColor="success" loading={loading} />
        <StatsCard title="Paid" value={stats.paid} icon="check" iconColor="success" loading={loading} />
        <StatsCard title="Pending" value={stats.pending} icon="clock" iconColor="warning" loading={loading} />
        <StatsCard title="Fulfilled" value={`${stats.fulfilled} (${stats.fulfillmentRate}%)`} icon="package" iconColor="info" loading={loading} />
        <StatsCard title="Pickup Orders" value={stats.pickupCount} icon="map-pin" iconColor="warning" loading={loading} />
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
