'use client';

import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';

// Quote status type
export type QuoteStatus = 'draft' | 'pending' | 'reviewing' | 'quoted' | 'approved' | 'rejected' | 'expired';

interface QuoteItem {
  id: string;
  productId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  requestedPrice?: number;
  quotedPrice?: number;
  notes?: string;
}

interface Quote {
  id: string;
  quoteNumber?: string;
  status: QuoteStatus;
  items: QuoteItem[];
  notes?: string;
  priority: 'normal' | 'urgent';
  requestedDeliveryDate?: string;
  validUntil?: string;
  subtotal?: number;
  discount?: number;
  total?: number;
  createdAt: string;
  updatedAt: string;
  quotedAt?: string;
  respondedBy?: string;
  responseNotes?: string;
}

interface QuoteDetailViewProps {
  quote: Quote;
  onAccept?: () => void;
  onReject?: () => void;
  onConvertToOrder?: () => void;
  isProcessing?: boolean;
}

export function QuoteDetailView({ 
  quote, 
  onAccept, 
  onReject, 
  onConvertToOrder,
  isProcessing = false 
}: QuoteDetailViewProps) {
  const statusConfig = getStatusConfig(quote.status);
  const isQuoted = quote.status === 'quoted';
  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date();

  return (
    <div className="quote-detail">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h4 style={{ marginBottom: 4 }}>
            Quote #{quote.quoteNumber || quote.id.substring(0, 8)}
          </h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Requested {formatRelativeTime(quote.createdAt)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="badge" style={statusConfig.style}>
            <i className={`ti ti-${statusConfig.icon}`} style={{ marginRight: 4 }}></i>
            {statusConfig.label}
          </span>
          {quote.priority === 'urgent' && (
            <span className="badge" style={{ background: 'var(--red)', color: '#fff', marginLeft: 8 }}>
              <i className="ti ti-urgent" style={{ marginRight: 4 }}></i>
              Urgent
            </span>
          )}
        </div>
      </div>

      {/* Expiry Warning */}
      {isQuoted && quote.validUntil && (
        <div className={`apple-alert ${isExpired ? 'apple-alert-error' : 'apple-alert-warning'}`} style={{ display: 'flex', alignItems: 'center' }}>
          <i className={`ti ti-${isExpired ? 'alert-circle' : 'clock'}`} style={{ marginRight: 8 }}></i>
          {isExpired ? (
            <span>This quote has expired on {formatDate(quote.validUntil)}</span>
          ) : (
            <span>Quote valid until <strong>{formatDate(quote.validUntil)}</strong> ({formatRelativeTime(quote.validUntil)})</span>
          )}
        </div>
      )}

      {/* Response from Seller */}
      {quote.responseNotes && (
        <div className="card" style={{ borderColor: 'var(--accent)', marginBottom: 24 }}>
          <div className="card-header" style={{ background: 'var(--accent)', color: '#fff' }}>
            <i className="ti ti-message" style={{ marginRight: 8 }}></i>
            Response from Sales Team
          </div>
          <div className="card-body">
            <p style={{ margin: 0 }}>{quote.responseNotes}</p>
            {quote.quotedAt && (
              <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 8 }}>
                Responded {formatRelativeTime(quote.quotedAt)}
                {quote.respondedBy && ` by ${quote.respondedBy}`}
              </small>
            )}
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h6 style={{ margin: 0 }}>
            <i className="ti ti-package" style={{ marginRight: 8 }}></i>
            Quote Items ({quote.items.length})
          </h6>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table className="apple-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'center' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Your Price</th>
                  <th style={{ textAlign: 'right' }}>Quoted Price</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.variantTitle && (
                        <small style={{ color: 'var(--text-secondary)' }}>{item.variantTitle}</small>
                      )}
                      {item.notes && (
                        <div style={{ marginTop: 4 }}>
                          <small style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Note: {item.notes}</small>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right' }}>
                      {item.requestedPrice 
                        ? formatCurrency(item.requestedPrice)
                        : <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.quotedPrice ? (
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                          {formatCurrency(item.quotedPrice)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Pending</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {item.quotedPrice 
                        ? formatCurrency(item.quotedPrice * item.quantity)
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quote Summary */}
      {(quote.subtotal || quote.total) && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '50%', minWidth: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                  <span>{formatCurrency(quote.subtotal || 0)}</span>
                </div>
                {quote.discount && quote.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: 'var(--green)' }}>
                    <span>Discount</span>
                    <span>-{formatCurrency(quote.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', fontWeight: 700, fontSize: '1.15rem' }}>
                  <span>Total</span>
                  <span>{formatCurrency(quote.total || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Details */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h6 style={{ margin: 0 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 8 }}></i>
            Request Details
          </h6>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Requested Delivery</label>
              <p style={{ margin: 0 }}>
                {quote.requestedDeliveryDate 
                  ? formatDate(quote.requestedDeliveryDate)
                  : 'No specific date'
                }
              </p>
            </div>
            <div>
              <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Priority</label>
              <p style={{ margin: 0 }}>
                <span className="badge" style={quote.priority === 'urgent' ? { background: 'var(--red)', color: '#fff' } : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {quote.priority}
                </span>
              </p>
            </div>
            {quote.notes && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Your Notes</label>
                <p style={{ margin: 0 }}>{quote.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isQuoted && !isExpired && (
        <div className="card" style={{ background: 'var(--bg-secondary)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                <i className="ti ti-info-circle" style={{ marginRight: 4 }}></i>
                Accept this quote to proceed with your order
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {onReject && (
                  <button
                    className="btn-apple btn-apple-secondary"
                    onClick={onReject}
                    disabled={isProcessing}
                    style={{ color: 'var(--red)' }}
                  >
                    <i className="ti ti-x" style={{ marginRight: 4 }}></i>
                    Decline
                  </button>
                )}
                {onAccept && (
                  <button
                    className="btn-apple btn-apple-primary"
                    onClick={onAccept}
                    disabled={isProcessing}
                    style={{ background: 'var(--green)' }}
                  >
                    {isProcessing ? (
                      <span className="spinner-apple" style={{ marginRight: 8 }}></span>
                    ) : (
                      <i className="ti ti-check" style={{ marginRight: 4 }}></i>
                    )}
                    Accept Quote
                  </button>
                )}
                {onConvertToOrder && (
                  <button
                    className="btn-apple btn-apple-primary"
                    onClick={onConvertToOrder}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <span className="spinner-apple" style={{ marginRight: 8 }}></span>
                    ) : (
                      <i className="ti ti-shopping-cart" style={{ marginRight: 4 }}></i>
                    )}
                    Convert to Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Quote list item component
interface QuoteListItemProps {
  quote: Quote;
  onClick?: () => void;
}

export function QuoteListItem({ quote, onClick }: QuoteListItemProps) {
  const statusConfig = getStatusConfig(quote.status);
  const itemCount = quote.items.length;
  const totalQuantity = quote.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div 
      className="card hover-shadow"
      onClick={onClick}
      style={{ cursor: 'pointer', marginBottom: 8 }}
    >
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h6 style={{ marginBottom: 4 }}>
              Quote #{quote.quoteNumber || quote.id.substring(0, 8)}
              {quote.priority === 'urgent' && (
                <span className="badge" style={{ background: 'var(--red)', color: '#fff', marginLeft: 8, fontSize: '0.75rem' }}>Urgent</span>
              )}
            </h6>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              {itemCount} product{itemCount !== 1 ? 's' : ''} • {totalQuantity} unit{totalQuantity !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge" style={statusConfig.style}>
              <i className={`ti ti-${statusConfig.icon}`} style={{ marginRight: 4 }}></i>
              {statusConfig.label}
            </span>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, marginTop: 4 }}>
              {formatRelativeTime(quote.updatedAt || quote.createdAt)}
            </p>
          </div>
        </div>
        {quote.total && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Quoted Total</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Quote status badge
interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function QuoteStatusBadge({ status, size = 'md' }: QuoteStatusBadgeProps) {
  const config = getStatusConfig(status);
  const fontSize = size === 'sm' ? '0.75rem' : size === 'lg' ? '1rem' : '0.85rem';
  
  return (
    <span className="badge" style={{ ...config.style, fontSize }}>
      <i className={`ti ti-${config.icon}`} style={{ marginRight: 4 }}></i>
      {config.label}
    </span>
  );
}

// Helper function for status configuration
function getStatusConfig(status: QuoteStatus) {
  const configs: Record<QuoteStatus, { label: string; style: { background: string; color: string }; icon: string }> = {
    draft: { label: 'Draft', style: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }, icon: 'edit' },
    pending: { label: 'Pending', style: { background: 'var(--orange)', color: '#fff' }, icon: 'clock' },
    reviewing: { label: 'Under Review', style: { background: 'var(--accent)', color: '#fff' }, icon: 'eye' },
    quoted: { label: 'Quoted', style: { background: 'var(--accent)', color: '#fff' }, icon: 'check' },
    approved: { label: 'Approved', style: { background: 'var(--green)', color: '#fff' }, icon: 'check-circle' },
    rejected: { label: 'Declined', style: { background: 'var(--red)', color: '#fff' }, icon: 'x-circle' },
    expired: { label: 'Expired', style: { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }, icon: 'clock-off' },
  };
  return configs[status] || configs.pending;
}

// Quote timeline for tracking
interface QuoteTimelineProps {
  quote: Quote;
}

export function QuoteTimeline({ quote }: QuoteTimelineProps) {
  const events = [
    { 
      date: quote.createdAt, 
      label: 'Quote Requested', 
      icon: 'file-plus',
      completed: true 
    },
    { 
      date: quote.status !== 'pending' && quote.status !== 'draft' ? quote.updatedAt : null, 
      label: 'Under Review', 
      icon: 'eye',
      completed: ['reviewing', 'quoted', 'approved', 'rejected'].includes(quote.status)
    },
    { 
      date: quote.quotedAt, 
      label: 'Quote Provided', 
      icon: 'file-check',
      completed: ['quoted', 'approved'].includes(quote.status)
    },
    { 
      date: quote.status === 'approved' ? quote.updatedAt : null, 
      label: 'Quote Accepted', 
      icon: 'check-circle',
      completed: quote.status === 'approved'
    },
  ];

  return (
    <div className="quote-timeline">
      {events.map((event, index) => (
        <div key={index} style={{ display: 'flex', marginBottom: 16 }}>
          <div style={{ marginRight: 16 }}>
            <div 
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: event.completed ? 'var(--green)' : 'var(--bg-secondary)',
                color: event.completed ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <i className={`ti ti-${event.icon}`}></i>
            </div>
            {index < events.length - 1 && (
              <div 
                style={{
                  width: 2,
                  height: 24,
                  marginTop: 4,
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  background: event.completed ? 'var(--green)' : 'var(--bg-secondary)',
                }}
              ></div>
            )}
          </div>
          <div>
            <div style={event.completed ? { fontWeight: 600 } : { color: 'var(--text-secondary)' }}>
              {event.label}
            </div>
            {event.date && (
              <small style={{ color: 'var(--text-secondary)' }}>{formatDate(event.date)}</small>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
