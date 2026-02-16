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
  // Store selected carrier per order: { orderId: { carrier, service } }
  const [selectedRates, setSelectedRates] = useState<Record<string, { carrier: string; service: string }>>({});

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

  const createLabel = async (orderId: string, carrier = 'USPS', service = 'GroundAdvantage') => {
    setProcessingId(orderId);
    try {
      const res = await adminFetch(`/api/v1/shipping/ship`, {
        method: 'POST',
        body: JSON.stringify({ orderId, carrier, service }),
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

  const batchShip = async () => {
    const readyIds = orders.filter(o => o.status === 'READY_TO_SHIP' && !o.labelUrl).map(o => o.id);
    if (readyIds.length === 0) return;

    setLoading(true);
    try {
      const res = await adminFetch('/api/v1/shipping/ship/batch', {
        method: 'POST',
        body: JSON.stringify({ orderIds: readyIds }),
      });
      if (res.ok) {
        alert(`${readyIds.length} labels created in batch!`);
        loadOrders();
      }
    } catch (err) {
      alert('Batch shipping failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipping & Logistics</h1>
          <p className="page-subtitle">Manage EasyPost labels and Intelligent Routing</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 12 }}>
           <button className="btn-apple secondary" onClick={batchShip} disabled={loading || orders.filter(o => o.status === 'READY_TO_SHIP' && !o.labelUrl).length === 0}>
             <i className="ti ti-layers-intersect" /> Batch Ship ({orders.filter(o => o.status === 'READY_TO_SHIP' && !o.labelUrl).length})
           </button>
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
                      <div className="flex gap-8 items-center">
                        {!order.labelUrl && (
                          <select
                            className="btn-apple ghost small"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onChange={(e) => {
                              const [carrier, service] = e.target.value.split(':');
                              setSelectedRates(prev => ({
                                ...prev,
                                [order.id]: { carrier, service }
                              }));
                            }}
                            value={selectedRates[order.id] ? `${selectedRates[order.id].carrier}:${selectedRates[order.id].service}` : 'USPS:GroundAdvantage'}
                          >
                            <option value="USPS:GroundAdvantage">USPS Ground ($4.20)</option>
                            <option value="UPS:Ground">UPS Ground ($8.50)</option>
                            <option value="FEDEX:Ground">FedEx Ground ($9.10)</option>
                          </select>
                        )}

                        {order.labelUrl ? (
                          <a href={order.labelUrl} target="_blank" className="btn-apple secondary small">
                            <i className="ti ti-download" /> Label
                          </a>
                        ) : (
                          <button
                            className="btn-apple primary small"
                            onClick={() => {
                              const selection = selectedRates[order.id] || { carrier: 'USPS', service: 'GroundAdvantage' };
                              createLabel(order.id, selection.carrier, selection.service);
                            }}
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
