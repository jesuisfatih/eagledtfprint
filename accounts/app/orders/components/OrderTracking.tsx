'use client';

interface OrderData {
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  productionJobs?: any[];
}

interface OrderTrackingProps {
  order: OrderData;
}

const MANU_STAGES = [
  { id: 'QUEUED', label: 'Queued', icon: 'ti-list-check' },
  { id: 'PREPRESS', label: 'Pre-Press', icon: 'ti-edit' },
  { id: 'PRINTING', label: 'Printing', icon: 'ti-printer' },
  { id: 'CURING', label: 'Curing', icon: 'ti-flame' },
  { id: 'CUTTING', label: 'Cutting', icon: 'ti-scissors' },
  { id: 'QC_CHECK', label: 'Quality Control', icon: 'ti-clipboard-check' },
  { id: 'PACKAGING', label: 'Packaging', icon: 'ti-package' },
  { id: 'READY', label: 'Ready', icon: 'ti-circle-check' },
  { id: 'PICKED_UP', label: 'Picked Up', icon: 'ti-hand-finger' },
  { id: 'SHIPPED', label: 'Shipped', icon: 'ti-truck' },
  { id: 'COMPLETED', label: 'Completed', icon: 'ti-check' },
  { id: 'CANCELLED', label: 'Cancelled', icon: 'ti-x' },
];

export default function OrderTracking({ order }: OrderTrackingProps) {
  // Current production status (from first job if available)
  const jobs = order.productionJobs || [];
  const currentStatus = jobs.length > 0 ? jobs[0].status : null;

  const currentStageIdx = MANU_STAGES.findIndex(s => s.id === currentStatus);
  const isComplete = order.fulfillmentStatus === 'fulfilled' || order.fulfillmentStatus === 'delivered';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Detailed Manufacturing Status (12-Stage Pipeline) */}
      {!isComplete && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h6 className="card-title" style={{ marginBottom: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                 <i className="ti ti-building-factory" style={{ color: 'var(--accent)' }}></i>
                 Live Factory Status
              </span>
            </h6>
            <span className="badge-apple success" style={{ fontSize: 10 }}>Live Update</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {MANU_STAGES.map((stage, idx) => {
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                const color = isPassed ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--text-quaternary)';

                return (
                  <div key={stage.id} style={{
                    textAlign: 'center', padding: '10px 4px', borderRadius: 12,
                    background: isCurrent ? 'rgba(0,122,255,0.08)' : 'transparent',
                    border: isCurrent ? '1px solid rgba(0,122,255,0.1)' : '1px solid transparent'
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', margin: '0 auto 8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isPassed ? 'rgba(52,199,89,0.1)' : isCurrent ? 'var(--accent)' : 'rgba(142,142,147,0.1)',
                      color: isPassed ? 'var(--green)' : isCurrent ? '#fff' : 'var(--text-quaternary)'
                    }}>
                      <i className={`ti ${stage.icon}`} style={{ fontSize: 16 }}></i>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      textTransform: 'uppercase', letter-spacing: '0.2px'
                    }}>
                      {stage.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legacy Logistics Tracking */}
      <div className="card">
        <div className="card-header">
          <h6 className="card-title" style={{ marginBottom: 0 }}>Logistics Timeline</h6>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { name: 'Order Placed', completed: true, date: order.createdAt },
              { name: 'Payment Confirmed', completed: order.financialStatus === 'paid', date: order.createdAt },
              { name: 'Production Finished', completed: currentStatus === 'READY' || isComplete, date: null },
              { name: 'Handed to Carrier', completed: isComplete, date: null },
            ].map((step, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', paddingBottom: i < arr.length - 1 ? 24 : 0 }}>
                {i < arr.length - 1 && (
                  <div style={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 2, background: step.completed ? 'var(--green)' : 'var(--border)' }} />
                )}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.completed ? 'var(--green)' : 'var(--bg-secondary)',
                  color: step.completed ? '#fff' : 'var(--text-tertiary)',
                  flexShrink: 0, fontSize: '0.75rem', zIndex: 1
                }}>
                  {step.completed ? <i className="ti ti-check"></i> : <span>{i + 1}</span>}
                </div>
                <div style={{ marginLeft: 12, flex: 1 }}>
                  <h6 style={{ marginBottom: 2, fontSize: 14 }}>{step.name}</h6>
                  {step.date && (
                    <small style={{ color: 'var(--text-tertiary)' }}>{new Date(step.date).toLocaleString()}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
