'use client';

import { adminFetch } from '@/lib/api-client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface ShippingOrder {
  id: string;
  shopifyOrderNumber: string;
  customerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  totalItems: number;
  weightOz?: number;
  status: 'READY_TO_SHIP' | 'READY_FOR_PICKUP' | 'SHIPPED';
  carrier?: string;
  trackingNumber?: string;
  labelUrl?: string;
}

export default function ShippingLogisticsPage() {
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/shipping/pending');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to load shipping orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const createLabel = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const res = await adminFetch(`/api/v1/shipping/ship`, {
        method: 'POST',
        body: JSON.stringify({ orderId, carrier: 'USPS', service: 'GroundAdvantage' }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Label created! Tracking: ${data.trackingNumber}`);
        loadOrders();
      }
    } catch (err) {
      alert('Error creating shipping label');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipping & Logistics</h1>
          <p className="page-subtitle">Manage EasyPost labels and Intelligent Routing</p>
        </div>
        <div className="page-header-actions">
           <button className="btn-apple primary" onClick={loadOrders}>
             <i className="ti ti-refresh" /> Refresh
           </button>
        </div>
      </div>

      <div className="apple-card mt-24">
        <div className="apple-table-container">
          <table className="apple-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Destination</th>
                <th>Items</th>
                <th>Status</th>
                <th>Logistics Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="text-center">No orders pending shipping</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>#{order.shopifyOrderNumber}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{order.customerName}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{order.city}, {order.state}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{order.zip}</div>
                    </td>
                    <td>{order.totalItems} designs</td>
                    <td>
                      <span className={`badge-apple ${order.status === 'READY_FOR_PICKUP' ? 'warning' : 'info'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        {order.labelUrl ? (
                          <a href={order.labelUrl} target="_blank" className="btn-apple secondary small">
                            <i className="ti ti-download" /> Label
                          </a>
                        ) : (
                          <button
                            className="btn-apple primary small"
                            onClick={() => createLabel(order.id)}
                            disabled={processingId === order.id}
                          >
                            <i className="ti ti-barcode" /> {processingId === order.id ? '...' : 'Create Label'}
                          </button>
                        )}
                        <Link href={`/orders/${order.id}`} className="btn-apple ghost small">
                          <i className="ti ti-eye" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stats-grid mt-24" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-label">Intelligent Routing Savings</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>$1,242.50</div>
          <div className="stat-meta">Saved by suggesting local pickup</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Ship Time</div>
          <div className="stat-value">4.2h</div>
          <div className="stat-meta">Ready → Shipped (Last 7 days)</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">EasyPost Balance</div>
          <div className="stat-value">$468.20</div>
          <div className="stat-meta">Auto-refill at $100</div>
        </div>
      </div>
    </div>
  );
}
