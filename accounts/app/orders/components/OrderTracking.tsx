'use client';

interface OrderData {
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
}

interface OrderTrackingProps {
  order: OrderData;
}

export default function OrderTracking({ order }: OrderTrackingProps) {
  const steps = [
    { name: 'Order Placed', completed: true, date: order.createdAt },
    { name: 'Processing', completed: order.financialStatus === 'paid', date: order.createdAt },
    { name: 'Shipped', completed: order.fulfillmentStatus === 'fulfilled', date: null },
    { name: 'Delivered', completed: false, date: null },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h6 className="card-title" style={{ marginBottom: 0 }}>Order Tracking</h6>
      </div>
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', paddingBottom: i < steps.length - 1 ? 24 : 0 }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 2, background: step.completed ? 'var(--green)' : 'var(--border)' }} />
              )}
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: step.completed ? 'var(--green)' : 'var(--bg-secondary)',
                color: step.completed ? '#fff' : 'var(--text-secondary)',
                flexShrink: 0,
                fontSize: '0.75rem',
              }}>
                {step.completed && <i className="ti ti-check"></i>}
              </div>
              <div style={{ marginLeft: 12, flex: 1 }}>
                <h6 style={{ marginBottom: 0 }}>{step.name}</h6>
                {step.date && (
                  <small style={{ color: 'var(--text-secondary)' }}>{new Date(step.date).toLocaleString()}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

