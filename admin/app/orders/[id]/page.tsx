'use client';

import { adminFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => { loadOrder(); }, []);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await adminFetch(`/api/v1/orders/${params.id}`);
      const data = await response.json();
      setOrder(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePrepareForPrinting = async () => {
    try {
      setIsPreparing(true);
      const res = await adminFetch(`/api/v1/penpot/create-from-order/${params.id}`, {
        method: 'POST',
      });
      if (res.ok) {
        await loadOrder();
      } else {
        const error = await res.json();
        alert(`Failed to prepare design: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to design service');
    } finally {
      setIsPreparing(false);
    }
  };

  const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`;
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString() : '—';

  const riskColors: Record<string, { bg: string; color: string }> = {
    low: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
    normal: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
    medium: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
    high: { bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    paid: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
    pending: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
    refunded: { bg: 'rgba(0,122,255,0.12)', color: '#007aff' },
    partially_refunded: { bg: 'rgba(0,122,255,0.12)', color: '#007aff' },
    voided: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
    failed: { bg: 'rgba(255,59,48,0.12)', color: '#ff3b30' },
    fulfilled: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
    partial: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
    unfulfilled: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
    // Pickup statuses
    ready: { bg: 'rgba(0,122,255,0.12)', color: '#007aff' },
    picked_up: { bg: 'rgba(52,199,89,0.12)', color: '#34c759' },
    assigned: { bg: 'rgba(255,149,0,0.12)', color: '#ff9500' },
    waiting: { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' },
  };

  const getBadge = (status: string, map: Record<string, { bg: string; color: string }>) => {
    const s = map[status] || map['normal'] || { bg: 'rgba(142,142,147,0.12)', color: '#8e8e93' };
    return (
      <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
        {status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown'}
      </span>
    );
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div className="spinner-apple" />
      <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading order...</p>
    </div>
  );

  if (!order) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <i className="ti ti-file-off" style={{ fontSize: 48, color: 'var(--text-tertiary)' }} />
      <h4 style={{ marginTop: 16 }}>Order not found</h4>
      <Link href="/orders" className="btn-apple primary" style={{ marginTop: 12, textDecoration: 'none' }}>← Back to Orders</Link>
    </div>
  );

  const fulfillments = Array.isArray(order.fulfillments) ? order.fulfillments : [];
  const refunds = Array.isArray(order.refunds) ? order.refunds : [];
  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
  const designFiles = Array.isArray(order.designFiles) ? order.designFiles : [];
  const tags = order.tags ? order.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <div>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: 20 }}>
        <Link href="/orders" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontSize: 14 }}>
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }} />Back to Orders
        </Link>
      </nav>

      {/* Header */}
      <div className="apple-card" style={{ marginBottom: 20 }}>
        <div className="apple-card-body" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 700 }}>
                Order #{order.shopifyOrderNumber || order.orderNumber}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {getBadge(order.financialStatus || order.paymentStatus, statusColors)}
                {getBadge(order.fulfillmentStatus, statusColors)}
                {order.riskLevel && order.riskLevel !== 'normal' && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    ...riskColors[order.riskLevel] || riskColors['normal'],
                  }}>
                    <i className="ti ti-shield-exclamation" style={{ marginRight: 4 }} />
                    Risk: {order.riskLevel}
                  </span>
                )}
                {order.isPickup && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: 'rgba(255,149,0,0.12)', color: '#ff9500',
                  }}>
                    <i className="ti ti-map-pin" style={{ marginRight: 4 }} />Pickup Order
                  </span>
                )}
                {order.hasDesignFiles && (
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: 'rgba(88,86,214,0.12)', color: '#5856d6',
                  }}>
                    <i className="ti ti-file-upload" style={{ marginRight: 4 }} />{designFiles.length} Design File{designFiles.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
                Placed on {fmtDate(order.createdAt)}
                {order.processedAt && ` · Processed ${fmtDate(order.processedAt)}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {order.isPickup && (
                <Link href="/pickup" className="btn-apple secondary" style={{ textDecoration: 'none' }}>
                  <i className="ti ti-map-pin" style={{ marginRight: 4 }} />Pickup
                </Link>
              )}
              {order.shopifyOrderId && (
                <a href={`${config.shopifyAdminBaseUrl}/orders/${order.shopifyOrderId}`}
                  target="_blank" rel="noopener noreferrer" className="btn-apple secondary" style={{ textDecoration: 'none' }}>
                  <i className="ti ti-external-link" style={{ marginRight: 4 }} />Shopify
                </a>
              )}
              {order.hasDesignFiles && (!order.linkedDesigns || order.linkedDesigns.length === 0) && (
                <button
                  className="btn-apple primary"
                  onClick={handlePrepareForPrinting}
                  disabled={isPreparing}
                >
                  {isPreparing ? (
                    <span className="spinner-apple small" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  ) : (
                    <><i className="ti ti-palette" style={{ marginRight: 4 }} />Prepare for Printing</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div>
          {/* Pickup Status Card */}
          {order.pickupOrder && (
            <div className="apple-card" style={{ marginBottom: 20, border: '1px solid rgba(255,149,0,0.2)' }}>
              <div className="apple-card-header" style={{ background: 'rgba(255,149,0,0.04)' }}>
                <h3 className="apple-card-title" style={{ color: '#ff9500' }}>
                  <i className="ti ti-map-pin" style={{ marginRight: 8 }} />Pickup Status
                </h3>
              </div>
              <div className="apple-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Status</div>
                    {getBadge(order.pickupOrder.status, statusColors)}
                  </div>
                  {order.pickupOrder.shelfCode && (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Shelf</div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>
                        📍 {order.pickupOrder.shelfCode} — {order.pickupOrder.shelfName}
                      </div>
                    </div>
                  )}
                  {order.pickupOrder.qrCode && (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>QR Code</div>
                      <code style={{ fontSize: 12, padding: '3px 8px', background: 'var(--bg-secondary)', borderRadius: 4 }}>
                        {order.pickupOrder.qrCode}
                      </code>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {order.pickupOrder.assignedAt && <span>Assigned: {fmtDate(order.pickupOrder.assignedAt)}</span>}
                  {order.pickupOrder.readyAt && <span>Ready: {fmtDate(order.pickupOrder.readyAt)}</span>}
                  {order.pickupOrder.pickedUpAt && <span>Picked Up: {fmtDate(order.pickupOrder.pickedUpAt)}</span>}
                </div>
                <div style={{ marginTop: 12 }}>
                  <Link href="/pickup" style={{ fontSize: 13, color: 'var(--accent-primary)', textDecoration: 'none' }}>
                    <i className="ti ti-arrow-right" style={{ marginRight: 4 }} />Go to Pickup Management →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Penpot / Linked Designs */}
          {order.linkedDesigns && order.linkedDesigns.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20, border: '1px solid rgba(0, 209, 178, 0.2)' }}>
              <div className="apple-card-header" style={{ background: 'rgba(0, 209, 178, 0.04)' }}>
                <h3 className="apple-card-title" style={{ color: '#00d1b2' }}>
                  <i className="ti ti-vector" style={{ marginRight: 8 }} />Penpot Designs
                </h3>
              </div>
              <div className="apple-card-body">
                {order.linkedDesigns.map((d: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       {d.previewUrl ? (
                         <img src={d.previewUrl} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                       ) : (
                         <div style={{ width: 40, height: 40, borderRadius: 4, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="ti ti-photo" />
                         </div>
                       )}
                       <div>
                         <div style={{ fontWeight: 600 }}>{d.title || 'Untitled Project'}</div>
                         <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>ID: {d.penpotProjectId}</div>
                       </div>
                    </div>
                    <div className={`badge-apple ${d.status === 'approved' ? 'success' : 'info'}`}>{d.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Design Files / Upload Files */}
          {designFiles.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20, border: '1px solid rgba(88,86,214,0.2)' }}>
              <div className="apple-card-header" style={{ background: 'rgba(88,86,214,0.04)' }}>
                <h3 className="apple-card-title" style={{ color: '#5856d6' }}>
                  <i className="ti ti-file-upload" style={{ marginRight: 8 }} />Uploaded Design Files ({designFiles.length})
                </h3>
              </div>
              <div className="apple-card-body" style={{ padding: 0 }}>
                {designFiles.map((file: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 16, padding: 16,
                      borderBottom: i < designFiles.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}
                  >
                    {/* Thumbnail/Preview */}
                    <div style={{
                      width: 80, height: 80, borderRadius: 10, overflow: 'hidden',
                      background: 'var(--bg-secondary)', flexShrink: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {(file.previewUrl || file.thumbnailUrl) ? (
                        <img
                          src={file.previewUrl || file.thumbnailUrl}
                          alt={file.lineItemTitle}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
                          }}
                        />
                      ) : (
                        <i className="ti ti-file-upload" style={{ fontSize: 28, color: 'var(--text-tertiary)' }} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{file.lineItemTitle}</div>
                      {file.variantTitle && file.variantTitle !== 'Default Title' && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{file.variantTitle}</div>
                      )}
                      {/* DPI & Dimensions Visualization */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                         <span style={{
                           padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                           background: (file.dpi || 300) < 300 ? 'rgba(255,59,48,0.1)' : 'rgba(52,199,89,0.1)',
                           color: (file.dpi || 300) < 300 ? '#ff3b30' : '#34c759',
                           border: `1px solid ${(file.dpi || 300) < 300 ? 'rgba(255,59,48,0.2)' : 'rgba(52,199,89,0.2)'}`
                         }}>
                           {file.dpi || 300} DPI {(file.dpi || 300) < 300 ? '⚠️ LOW RES' : '✓ OK'}
                         </span>
                         {(file.rawWidth && file.rawHeight) && (
                           <span style={{
                             padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                             background: 'rgba(0,122,255,0.05)', color: '#007aff',
                             border: '1px solid rgba(0,122,255,0.1)'
                           }}>
                             📏 {file.rawWidth}" × {file.rawHeight}"
                           </span>
                         )}
                      </div>
                      {file.designType && (
                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                          <span style={{ padding: '2px 6px', background: 'rgba(88,86,214,0.08)', borderRadius: 4, color: '#5856d6' }}>
                            {file.designType}
                          </span>
                        </div>
                      )}
                      {file.fileName && (
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                          <i className="ti ti-file" style={{ marginRight: 4 }} />{file.fileName}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        Qty: {file.quantity} · {fmt(file.price)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      {file.printReadyUrl && (
                        <a href={file.printReadyUrl} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: 'rgba(52,199,89,0.12)', color: '#34c759', textDecoration: 'none',
                          }}>
                          <i className="ti ti-download" style={{ fontSize: 12 }} />Print Ready
                        </a>
                      )}
                      {file.previewUrl && (
                        <a href={file.previewUrl} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: 'rgba(0,122,255,0.12)', color: '#007aff', textDecoration: 'none',
                          }}>
                          <i className="ti ti-eye" style={{ fontSize: 12 }} />Preview
                        </a>
                      )}
                      {file.uploadedFileUrl && (
                        <a href={file.uploadedFileUrl} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: 'rgba(88,86,214,0.12)', color: '#5856d6', textDecoration: 'none',
                          }}>
                          <i className="ti ti-download" style={{ fontSize: 12 }} />Download
                        </a>
                      )}
                      {file.editUrl && (
                        <a href={file.editUrl} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: 'rgba(255,149,0,0.12)', color: '#ff9500', textDecoration: 'none',
                          }}>
                          <i className="ti ti-edit" style={{ fontSize: 12 }} />Edit
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production Status / Manufacturing Jobs */}
          {order.productionJobs && order.productionJobs.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20, border: '1px solid rgba(255,45,85,0.2)' }}>
              <div className="apple-card-header" style={{ background: 'rgba(255,45,85,0.04)' }}>
                <h3 className="apple-card-title" style={{ color: '#ff2d55' }}>
                  <i className="ti ti-printer" style={{ marginRight: 8 }} />Production Status
                </h3>
                <Link href="/production" className="btn-apple ghost small" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
                  View All Jobs →
                </Link>
              </div>
              <div className="apple-card-body">
                {order.productionJobs.map((job: any, i: number) => (
                  <div key={i} style={{
                    padding: 16, background: 'var(--bg-secondary)', borderRadius: 10,
                    marginBottom: i < order.productionJobs.length - 1 ? 12 : 0,
                    borderLeft: `4px solid ${job.status === 'COMPLETED' ? '#34c759' : '#ff2d55'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>Job #{job.id.substring(0, 8)}</span>
                      <span className={`badge-apple ${job.status === 'COMPLETED' ? 'success' : 'warning'}`}>
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                      <div>
                        <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Printer</div>
                        <div style={{ fontWeight: 500 }}>{job.printerName || 'Unassigned'}</div>
                      </div>
                      {job.estimatedCompletionAt && (
                        <div>
                          <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>Est. Completion</div>
                          <div>{new Date(job.estimatedCompletionAt).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="apple-card" style={{ marginBottom: 20 }}>
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-package" style={{ marginRight: 8 }} />Items ({lineItems.length})</h3>
            </div>
            <div className="apple-card-body" style={{ padding: 0 }}>
              <table className="apple-table" style={{ marginBottom: 0 }}>
                <thead><tr><th style={{ width: 50 }}></th><th>Product</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                <tbody>
                  {lineItems.map((item: any, i: number) => {
                    const hasProperties = item.properties && item.properties.length > 0;
                    const visibleProps = (item.properties || []).filter((p: any) => !(p.name || '').startsWith('_'));

                    return (
                      <tr key={i}>
                        <td>
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} style={{
                              width: 40, height: 40, borderRadius: 6, objectFit: 'cover',
                            }} />
                          ) : (
                            <div style={{
                              width: 40, height: 40, borderRadius: 6, background: 'var(--bg-secondary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <i className="ti ti-photo" style={{ fontSize: 16, color: 'var(--text-tertiary)' }} />
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.title || item.name}</div>
                          {item.sku && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>SKU: {item.sku}</div>}
                          {item.variant_title && item.variant_title !== 'Default Title' && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.variant_title}</div>
                          )}
                          {/* Show properties */}
                          {visibleProps.length > 0 && (
                            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {visibleProps.map((p: any, pi: number) => (
                                <span key={pi} style={{
                                  padding: '2px 6px', borderRadius: 4, fontSize: 10,
                                  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                }}>
                                  {p.name}: {p.value?.length > 30 ? (
                                    <a href={p.value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                                      {p.value.startsWith('http') ? '🔗 link' : p.value.substring(0, 30) + '…'}
                                    </a>
                                  ) : p.value}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt((item.price || 0) * (item.quantity || 1))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fulfillments & Tracking */}
          {fulfillments.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-truck" style={{ marginRight: 8 }} />Fulfillments ({fulfillments.length})</h3>
              </div>
              <div className="apple-card-body">
                {fulfillments.map((f: any, i: number) => (
                  <div key={i} style={{
                    padding: 16, background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: i < fulfillments.length - 1 ? 12 : 0,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>Shipment #{i + 1}</span>
                      {getBadge(f.status || f.shipmentStatus || 'pending', statusColors)}
                    </div>
                    {f.trackingNumber && (
                      <div style={{ marginBottom: 8, fontSize: 14 }}>
                        <strong>Tracking:</strong>{' '}
                        {f.trackingUrl ? (
                          <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                            {f.trackingNumber} <i className="ti ti-external-link" style={{ fontSize: 12 }} />
                          </a>
                        ) : f.trackingNumber}
                      </div>
                    )}
                    {f.trackingCompany && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <i className="ti ti-building" style={{ marginRight: 4 }} />{f.trackingCompany}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Created: {fmtDate(f.createdAt)}</div>
                    {f.lineItems && f.lineItems.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        <strong>Items:</strong> {f.lineItems.map((li: any) => `${li.title} ×${li.quantity}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Notifications / Activity Log */}
          {order.activityLogs && order.activityLogs.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-bell-ringing" style={{ marginRight: 8 }} />Notifications</h3>
              </div>
              <div className="apple-card-body">
                {order.activityLogs.map((log: any, i: number) => (
                  <div key={i} style={{
                    padding: 12, borderBottom: i < order.activityLogs.length - 1 ? '1px solid var(--border-light)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>
                        {log.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                        Via Dittofeed
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {fmtDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refunds */}
          {refunds.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title" style={{ color: '#ff3b30' }}>
                  <i className="ti ti-arrow-back" style={{ marginRight: 8 }} />Refunds ({refunds.length})
                </h3>
              </div>
              <div className="apple-card-body">
                {refunds.map((r: any, i: number) => (
                  <div key={i} style={{
                    padding: 16, background: 'rgba(255,59,48,0.04)', borderRadius: 10, border: '1px solid rgba(255,59,48,0.12)',
                    marginBottom: i < refunds.length - 1 ? 12 : 0,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600 }}>Refund #{i + 1}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fmtDate(r.createdAt)}</span>
                    </div>
                    {r.note && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>Note: {r.note}</p>}
                    {r.transactions?.map((t: any, ti: number) => (
                      <div key={ti} style={{ fontSize: 14, fontWeight: 600, color: '#ff3b30' }}>
                        -{fmt(t.amount)} ({t.kind})
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer & Address */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {order.shippingAddress && (
              <div className="apple-card">
                <div className="apple-card-header">
                  <h3 className="apple-card-title"><i className="ti ti-map-pin" style={{ marginRight: 8 }} />Shipping</h3>
                </div>
                <div className="apple-card-body" style={{ fontSize: 14 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{order.shippingAddress.first_name || order.shippingAddress.firstName} {order.shippingAddress.last_name || order.shippingAddress.lastName}</p>
                  {order.shippingAddress.company && <p style={{ marginBottom: 4 }}>{order.shippingAddress.company}</p>}
                  <p style={{ marginBottom: 4 }}>{order.shippingAddress.address1}</p>
                  {order.shippingAddress.address2 && <p style={{ marginBottom: 4 }}>{order.shippingAddress.address2}</p>}
                  <p style={{ marginBottom: 4 }}>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}</p>
                  <p style={{ marginBottom: 0 }}>{order.shippingAddress.country}</p>
                </div>
              </div>
            )}
            {order.billingAddress && (
              <div className="apple-card">
                <div className="apple-card-header">
                  <h3 className="apple-card-title"><i className="ti ti-credit-card" style={{ marginRight: 8 }} />Billing</h3>
                </div>
                <div className="apple-card-body" style={{ fontSize: 14 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>{order.billingAddress.first_name || order.billingAddress.firstName} {order.billingAddress.last_name || order.billingAddress.lastName}</p>
                  {order.billingAddress.company && <p style={{ marginBottom: 4 }}>{order.billingAddress.company}</p>}
                  <p style={{ marginBottom: 4 }}>{order.billingAddress.address1}</p>
                  <p style={{ marginBottom: 4 }}>{order.billingAddress.city}, {order.billingAddress.province} {order.billingAddress.zip}</p>
                  <p style={{ marginBottom: 0 }}>{order.billingAddress.country}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Order Summary */}
          <div className="apple-card" style={{ marginBottom: 20 }}>
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-receipt" style={{ marginRight: 8 }} />Summary</h3>
            </div>
            <div className="apple-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span>{fmt(order.subtotal || order.subtotalPrice)}</span>
                </div>
                {Number(order.totalShipping) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                    <span>{fmt(order.totalShipping)}</span>
                  </div>
                )}
                {Number(order.totalTax || order.taxTotal) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
                    <span>{fmt(order.totalTax || order.taxTotal)}</span>
                  </div>
                )}
                {Number(order.totalDiscounts || order.discountTotal) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Discounts</span>
                    <span style={{ color: '#34c759' }}>-{fmt(order.totalDiscounts || order.discountTotal)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{fmt(order.totalPrice)}</span>
                  </div>
                </div>
                {Number(order.totalRefunded) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ff3b30' }}>
                    <span>Refunded</span>
                    <span>-{fmt(order.totalRefunded)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="apple-card" style={{ marginBottom: 20 }}>
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-user" style={{ marginRight: 8 }} />Customer</h3>
            </div>
            <div className="apple-card-body" style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.company && (
                <div>
                  <Link href={`/companies/${order.company.id}`} style={{ fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}>
                    <i className="ti ti-building" style={{ marginRight: 4 }} />{order.company.name}
                  </Link>
                </div>
              )}
              {order.companyUser && (
                <div><strong>User:</strong> {order.companyUser.firstName} {order.companyUser.lastName}</div>
              )}
              {order.email && (
                <div><i className="ti ti-mail" style={{ marginRight: 4, fontSize: 14 }} />{order.email}</div>
              )}
              {order.phone && (
                <div><i className="ti ti-phone" style={{ marginRight: 4, fontSize: 14 }} />{order.phone}</div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-notes" style={{ marginRight: 8 }} />Notes</h3>
              </div>
              <div className="apple-card-body" style={{ fontSize: 14 }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{order.notes}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="apple-card" style={{ marginBottom: 20 }}>
              <div className="apple-card-header">
                <h3 className="apple-card-title"><i className="ti ti-tags" style={{ marginRight: 8 }} />Tags</h3>
              </div>
              <div className="apple-card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map((tag: string, i: number) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                      background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lifecycle */}
          <div className="apple-card">
            <div className="apple-card-header">
              <h3 className="apple-card-title"><i className="ti ti-timeline" style={{ marginRight: 8 }} />Timeline</h3>
            </div>
            <div className="apple-card-body" style={{ fontSize: 13 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div><strong>Created:</strong> {fmtDate(order.createdAt)}</div>
                {order.processedAt && <div><strong>Processed:</strong> {fmtDate(order.processedAt)}</div>}
                {order.closedAt && <div><strong>Closed:</strong> {fmtDate(order.closedAt)}</div>}
                {order.cancelledAt && <div style={{ color: '#ff3b30' }}><strong>Cancelled:</strong> {fmtDate(order.cancelledAt)}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
