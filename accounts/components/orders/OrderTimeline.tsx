'use client';

import { formatDate, formatRelativeTime } from '@/lib/utils';

// Tracking event types
export type TrackingEventType = 
  | 'order_placed'
  | 'order_confirmed'
  | 'payment_received'
  | 'processing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'on_hold';

interface TrackingEvent {
  id: string;
  type: TrackingEventType;
  title: string;
  description?: string;
  location?: string;
  timestamp: string;
  isCompleted: boolean;
}

interface ShippingInfo {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shippingMethod?: string;
}

interface OrderTimelineProps {
  events: TrackingEvent[];
  currentStatus?: string;
  shippingInfo?: ShippingInfo;
}

export function OrderTimeline({ events, currentStatus, shippingInfo }: OrderTimelineProps) {
  // Sort events by timestamp
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="order-timeline">
      {/* Shipping Info Card */}
      {shippingInfo && (shippingInfo.carrier || shippingInfo.trackingNumber) && (
        <div className="card" style={{ borderColor: 'var(--accent)', marginBottom: 16 }}>
          <div className="card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h6 style={{ marginBottom: 4 }}>
                  <i className="ti ti-truck" style={{ marginRight: 8, color: 'var(--accent)' }}></i>
                  Shipping Information
                </h6>
                {shippingInfo.carrier && (
                  <p style={{ marginBottom: 4 }}>
                    Carrier: <strong>{shippingInfo.carrier}</strong>
                  </p>
                )}
                {shippingInfo.trackingNumber && (
                  <p style={{ marginBottom: 4 }}>
                    Tracking: <code style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 6 }}>{shippingInfo.trackingNumber}</code>
                  </p>
                )}
                {shippingInfo.shippingMethod && (
                  <p style={{ marginBottom: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Method: {shippingInfo.shippingMethod}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {shippingInfo.estimatedDelivery && (
                  <div style={{ marginBottom: 8 }}>
                    <small style={{ color: 'var(--text-secondary)', display: 'block' }}>Estimated Delivery</small>
                    <strong style={{ color: 'var(--green)' }}>{formatDate(shippingInfo.estimatedDelivery)}</strong>
                  </div>
                )}
                {shippingInfo.trackingUrl && (
                  <a 
                    href={shippingInfo.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-apple btn-apple-primary"
                    style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                  >
                    <i className="ti ti-external-link" style={{ marginRight: 4 }}></i>
                    Track Package
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {currentStatus && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <OrderProgressBar status={currentStatus} />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <div className="card-header">
          <h6 style={{ marginBottom: 0 }}>
            <i className="ti ti-history" style={{ marginRight: 8 }}></i>
            Order Timeline
          </h6>
        </div>
        <div className="card-body">
          {sortedEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
              <i className="ti ti-clock ti-2x" style={{ marginBottom: 8, display: 'block' }}></i>
              <p style={{ marginBottom: 0 }}>No tracking events yet</p>
            </div>
          ) : (
            <div className="timeline">
              {sortedEvents.map((event, index) => {
                const config = getEventConfig(event.type);
                const isFirst = index === 0;
                
                return (
                  <div key={event.id} style={{ display: 'flex', marginBottom: 16 }}>
                    <div style={{ marginRight: 12 }}>
                      <div 
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isFirst ? config.bgColor : 'var(--bg-secondary)',
                          color: isFirst ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        <i className={`ti ti-${config.icon}`}></i>
                      </div>
                      {index < sortedEvents.length - 1 && (
                        <div 
                          style={{ width: 2, height: 24, marginTop: 4, background: 'var(--bg-secondary)', marginLeft: 'auto', marginRight: 'auto' }}
                        ></div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h6 style={{ marginBottom: 4, color: isFirst ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {event.title}
                          </h6>
                          {event.description && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 4 }}>{event.description}</p>
                          )}
                          {event.location && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 0 }}>
                              <i className="ti ti-map-pin" style={{ marginRight: 4 }}></i>
                              {event.location}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          <div>{formatDate(event.timestamp)}</div>
                          <div>{formatRelativeTime(event.timestamp)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Order progress bar component
interface OrderProgressBarProps {
  status: string;
}

export function OrderProgressBar({ status }: OrderProgressBarProps) {
  const steps = [
    { key: 'placed', label: 'Ordered', icon: 'file-check' },
    { key: 'confirmed', label: 'Confirmed', icon: 'check' },
    { key: 'processing', label: 'Processing', icon: 'settings' },
    { key: 'shipped', label: 'Shipped', icon: 'truck' },
    { key: 'delivered', label: 'Delivered', icon: 'package' },
  ];

  const statusMapping: Record<string, number> = {
    'pending': 0,
    'placed': 1,
    'order_placed': 1,
    'confirmed': 2,
    'order_confirmed': 2,
    'processing': 3,
    'ready_for_pickup': 3,
    'shipped': 4,
    'out_for_delivery': 4,
    'delivered': 5,
    'fulfilled': 5,
  };

  const currentStep = statusMapping[status.toLowerCase()] || 1;

  return (
    <div className="order-progress">
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        {/* Progress line */}
        <div 
          style={{ 
            position: 'absolute',
            background: 'var(--bg-secondary)',
            top: 16, 
            left: '10%', 
            right: '10%', 
            height: 4,
            borderRadius: 2,
            zIndex: 0
          }}
        >
          <div 
            style={{ 
              background: 'var(--green)',
              height: '100%',
              borderRadius: 2,
              width: `${Math.min((currentStep - 1) / (steps.length - 1) * 100, 100)}%`,
              transition: 'width 0.3s ease'
            }}
          ></div>
        </div>

        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          
          return (
            <div 
              key={step.key} 
              style={{ textAlign: 'center', position: 'relative', zIndex: 1, flex: 1 }}
            >
              <div 
                style={{ 
                  width: 36, 
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                  background: isCompleted || isCurrent ? 'var(--green)' : 'var(--bg-secondary)',
                  color: isCompleted || isCurrent ? '#fff' : 'var(--text-secondary)',
                  border: isCurrent ? '3px solid var(--green)' : 'none'
                }}
              >
                {isCompleted ? (
                  <i className="ti ti-check"></i>
                ) : (
                  <i className={`ti ti-${step.icon}`}></i>
                )}
              </div>
              <small style={isCurrent ? { fontWeight: 600 } : { color: 'var(--text-secondary)' }}>
                {step.label}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact order status badge
interface OrderStatusBadgeProps {
  status: string;
  fulfillmentStatus?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function OrderStatusBadge({ status, fulfillmentStatus, size = 'md' }: OrderStatusBadgeProps) {
  const displayStatus = fulfillmentStatus || status;
  const config = getOrderStatusConfig(displayStatus);
  const fontSize = size === 'sm' ? '0.75rem' : size === 'lg' ? '1rem' : '0.875rem';
  
  return (
    <span className="badge" style={{ background: config.bgColor, color: '#fff', fontSize }}>
      <i className={`ti ti-${config.icon}`} style={{ marginRight: 4 }}></i>
      {config.label}
    </span>
  );
}

// Delivery estimate component
interface DeliveryEstimateProps {
  estimatedDate?: string;
  shippedDate?: string;
  className?: string;
}

export function DeliveryEstimate({ estimatedDate, shippedDate, className = '' }: DeliveryEstimateProps) {
  if (!estimatedDate && !shippedDate) return null;

  const now = new Date();
  const estimated = estimatedDate ? new Date(estimatedDate) : null;
  const daysUntil = estimated 
    ? Math.ceil((estimated.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className={`delivery-estimate ${className}`}>
      {estimated && daysUntil !== null && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <i className="ti ti-calendar-event" style={{ marginRight: 8, color: 'var(--accent)' }}></i>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Estimated Delivery</div>
            <div style={{ fontWeight: 600 }}>
              {formatDate(estimatedDate!)}
              {daysUntil > 0 && (
                <span style={{ color: 'var(--green)', marginLeft: 8 }}>({daysUntil} day{daysUntil !== 1 ? 's' : ''})</span>
              )}
              {daysUntil === 0 && (
                <span style={{ color: 'var(--green)', marginLeft: 8 }}>(Today!)</span>
              )}
              {daysUntil < 0 && (
                <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>(Delayed)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getEventConfig(type: TrackingEventType) {
  const configs: Record<TrackingEventType, { icon: string; bgColor: string }> = {
    order_placed: { icon: 'file-plus', bgColor: 'var(--accent)' },
    order_confirmed: { icon: 'check', bgColor: 'var(--green)' },
    payment_received: { icon: 'credit-card', bgColor: 'var(--green)' },
    processing: { icon: 'settings', bgColor: 'var(--accent)' },
    ready_for_pickup: { icon: 'package', bgColor: 'var(--accent)' },
    shipped: { icon: 'truck', bgColor: 'var(--accent)' },
    out_for_delivery: { icon: 'truck-delivery', bgColor: 'var(--orange)' },
    delivered: { icon: 'package-check', bgColor: 'var(--green)' },
    cancelled: { icon: 'x', bgColor: 'var(--red)' },
    refunded: { icon: 'receipt-refund', bgColor: 'var(--text-tertiary)' },
    on_hold: { icon: 'clock-pause', bgColor: 'var(--orange)' },
  };
  return configs[type] || { icon: 'point', bgColor: 'var(--text-tertiary)' };
}

function getOrderStatusConfig(status: string) {
  const lowerStatus = status.toLowerCase();
  
  const configs: Record<string, { label: string; bgColor: string; icon: string }> = {
    'pending': { label: 'Pending', bgColor: 'var(--orange)', icon: 'clock' },
    'paid': { label: 'Paid', bgColor: 'var(--green)', icon: 'credit-card' },
    'confirmed': { label: 'Confirmed', bgColor: 'var(--green)', icon: 'check' },
    'processing': { label: 'Processing', bgColor: 'var(--accent)', icon: 'settings' },
    'shipped': { label: 'Shipped', bgColor: 'var(--accent)', icon: 'truck' },
    'fulfilled': { label: 'Fulfilled', bgColor: 'var(--green)', icon: 'package' },
    'delivered': { label: 'Delivered', bgColor: 'var(--green)', icon: 'package-check' },
    'cancelled': { label: 'Cancelled', bgColor: 'var(--red)', icon: 'x' },
    'refunded': { label: 'Refunded', bgColor: 'var(--text-tertiary)', icon: 'receipt-refund' },
    'partially_fulfilled': { label: 'Partial', bgColor: 'var(--orange)', icon: 'package' },
    'unfulfilled': { label: 'Unfulfilled', bgColor: 'var(--text-tertiary)', icon: 'package-off' },
  };

  return configs[lowerStatus] || { label: status, bgColor: 'var(--text-tertiary)', icon: 'point' };
}
