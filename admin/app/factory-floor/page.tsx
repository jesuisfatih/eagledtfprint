'use client';

import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface FactoryOrder {
  orderId: string;
  orderNumber: string;
  company: string;
  email: string;
  phase: 'INTAKE' | 'DESIGN' | 'PRODUCTION' | 'READY' | 'COMPLETED';
  qrCode: string;
  designStatus: string;
  jobCount: number;
  rushPriority: boolean;
  progress: number;
  isOverdue: boolean;
  oldestJobAge: number; // in minutes
}

interface DashboardData {
  totals: {
    intake: number;
    design: number;
    production: number;
    ready: number;
  };
  orders: FactoryOrder[];
}

export default function FactoryFloorPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10s default

  // Modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [pipelineDetail, setPipelineDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handlePrintLabel = async (jobId: string) => {
    try {
      const res = await adminFetch(`/api/v1/production/jobs/${jobId}/label`);
      if (res.ok) {
        const labelData = await res.json();
        console.log('Printing label:', labelData);
        alert(`Label printed for ${labelData.labelId}\nOrder: ${labelData.orderNumber}`);
      }
    } catch (err) {
      console.error(err);
      alert('Label printing failed');
    }
  };

  const handleQcFail = async (jobId: string) => {
    if (!confirm('MARK AS QC FAILED? This will automatically re-queue the job with RUSH priority.')) return;
    try {
      const res = await adminFetch(`/api/v1/production/jobs/${jobId}/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: 'fail', notes: 'Operator reported failure.' })
      });
      if (res.ok) {
        alert('Job re-queued for re-printing.');
        if (selectedOrderId) loadPipelineDetail(selectedOrderId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadDashboard = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/production/factory-floor/dashboard');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load factory dashboard', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPipelineDetail = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLoadingDetail(true);
    try {
      const res = await adminFetch(`/api/v1/production/factory-floor/pipeline/${orderId}`);
      if (res.ok) {
        setPipelineDetail(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, refreshInterval);
    return () => clearInterval(timer);
  }, [loadDashboard, refreshInterval]);

  const filteredOrders = data?.orders.filter(o => {
    const matchesPhase = activePhase ? o.phase === activePhase : true;
    const matchesSearch = searchQuery
      ? o.orderNumber.includes(searchQuery) || o.company.toLowerCase().includes(searchQuery.toLowerCase()) || o.qrCode.includes(searchQuery)
      : true;
    return matchesPhase && matchesSearch;
  }) || [];

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'INTAKE': return 'var(--accent-orange)';
      case 'DESIGN': return 'var(--accent-purple)';
      case 'PRODUCTION': return 'var(--accent-blue)';
      case 'READY': return 'var(--accent-green)';
      default: return 'var(--text-tertiary)';
    }
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div className="page-header" style={{ marginBottom: 30 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 32 }}>Factory Floor</h1>
          <p className="page-subtitle">Real-time Manufacturing Pipeline & Order Tracking</p>
        </div>
        <div className="page-header-actions">
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary)', padding: '6px 16px', borderRadius: 40, border: '1px solid var(--border-primary)' }}>
              <div className="pulse-live" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase' }}>Live Sync</span>
           </div>
           <button className="btn-apple secondary" onClick={loadDashboard}>
             <i className="ti ti-refresh" />
           </button>
        </div>
      </div>

      {/* Stats / Phase Overview */}
      <div className="stats-grid cols-4" style={{ marginBottom: 32 }}>
        {[
          { id: 'INTAKE', label: 'Order Intake', count: data?.totals.intake || 0, color: 'orange', icon: 'ti-package' },
          { id: 'DESIGN', label: 'In Design', count: data?.totals.design || 0, color: 'purple', icon: 'ti-palette' },
          { id: 'PRODUCTION', label: 'In Printing', count: data?.totals.production || 0, color: 'blue', icon: 'ti-printer' },
          { id: 'READY', label: 'Ready / QA', count: data?.totals.ready || 0, color: 'green', icon: 'ti-circle-check' },
        ].map(p => (
          <div
            key={p.id}
            className={`stat-card ${activePhase === p.id ? 'active' : ''}`}
            onClick={() => setActivePhase(activePhase === p.id ? null : p.id)}
            style={{
              cursor: 'pointer',
              border: activePhase === p.id ? `2px solid var(--accent-${p.color})` : '1px solid var(--border-primary)',
              transform: activePhase === p.id ? 'scale(1.02)' : 'none'
            }}
          >
            <div className={`stat-icon ${p.color}`}><i className={`ti ${p.icon}`} /></div>
            <div className="stat-content">
              <div className="stat-label">{p.label}</div>
              <div className="stat-value" style={{ fontSize: 32 }}>{p.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="apple-card" style={{ marginBottom: 24, padding: '12px 20px' }}>
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-16">
               <div className="header-search" style={{ width: 320 }}>
                 <i className="ti ti-search header-search-icon" />
                 <input
                   placeholder="Scan QR or Search Order # / Company..."
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: 14 }}
                 />
               </div>
               {activePhase && (
                 <button className="btn-apple ghost sm" onClick={() => setActivePhase(null)}>
                   Clear Filter ×
                 </button>
               )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
               Displaying <strong>{filteredOrders.length}</strong> active orders
            </div>
         </div>
      </div>

      {/* Grid of Pipeline Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="apple-card skeleton" style={{ height: 220 }} />
          ))
        ) : filteredOrders.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', background: 'var(--bg-secondary)', borderRadius: 20, color: 'var(--text-tertiary)' }}>
             <i className="ti ti-mood-empty" style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
             <p>No active orders found in this phase.</p>
          </div>
        ) : filteredOrders.map(order => (
          <div key={order.orderId} className="apple-card" style={{ padding: 20, cursor: 'pointer', borderLeft: order.rushPriority ? '4px solid var(--accent-red)' : '1px solid var(--border-primary)' }} onClick={() => loadPipelineDetail(order.orderId)}>
            <div className="flex justify-between items-start mb-12">
               <div>
                  <div className="flex items-center gap-6">
                    <span style={{ fontSize: 18, fontWeight: 800 }}>#{order.orderNumber}</span>
                    {order.rushPriority && <span className="badge-apple red" style={{ fontSize: 9 }}>🔥 RUSH</span>}
                    {order.isOverdue && <span className="badge-apple orange" style={{ fontSize: 9 }}>⚠️ DELAYED</span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{order.company || 'Retail Customer'}</div>
               </div>
               <div style={{
                 padding: '4px 10px', borderRadius: 20, background: `color-mix(in srgb, ${getPhaseColor(order.phase)} 12%, transparent)`,
                 color: getPhaseColor(order.phase), fontSize: 11, fontWeight: 700
               }}>
                 {order.phase}
               </div>
            </div>

            <div style={{ marginBottom: 16 }}>
               <div className="flex justify-between items-end mb-6">
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Pipeline Progress</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{order.progress}%</span>
               </div>
               <div style={{ width: '100%', height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${order.progress}%`, height: '100%',
                    background: order.progress === 100 ? 'var(--accent-green)' : 'var(--accent-blue)',
                    transition: 'width 0.5s ease'
                  }} />
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
               <div style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                 <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>Design</div>
                 <div style={{ fontSize: 13, fontWeight: 600, color: order.designStatus === 'approved' ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                   {order.designStatus.toUpperCase()}
                 </div>
               </div>
               <div style={{ padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8 }}>
                 <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>Print Jobs</div>
                 <div style={{ fontSize: 13, fontWeight: 600 }}>{order.jobCount} files</div>
               </div>
            </div>

            <div className="flex justify-between items-center mt-16 pt-12" style={{ borderTop: '1px solid var(--border-secondary)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 12 }}>
                  <i className="ti ti-clock" />
                  <span>Waiting: {order.oldestJobAge}m</span>
               </div>
               <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--accent-blue)' }}>
                 {order.qrCode} <i className="ti ti-qrcode" />
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedOrderId && (
        <div className="apple-modal-overlay" onClick={() => setSelectedOrderId(null)}>
          <div className="apple-modal" style={{ maxWidth: 800, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header" style={{ padding: '24px 32px 0' }}>
               <div>
                  <h3 className="apple-modal-title" style={{ fontSize: 24 }}>Order Pipeline Detail</h3>
                  {pipelineDetail && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>#{pipelineDetail.orderNumber} — {pipelineDetail.companyName}</p>}
               </div>
               <button className="apple-modal-close" onClick={() => setSelectedOrderId(null)}>
                 <i className="ti ti-x" />
               </button>
            </div>

            <div className="apple-modal-body" style={{ padding: '24px 32px' }}>
               {loadingDetail ? (
                 <div style={{ padding: '60px 0', textAlign: 'center' }}><div className="spinner-apple" /></div>
               ) : pipelineDetail ? (
                 <div>
                    {/* Big Phase Indicator */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
                       {['INTAKE', 'DESIGN', 'PRODUCTION', 'READY'].map((p, i) => {
                          const isActive = pipelineDetail.currentPhase === p ||
                            (p === 'INTAKE' && ['DESIGN', 'PRODUCTION', 'READY', 'COMPLETED'].includes(pipelineDetail.currentPhase)) ||
                            (p === 'DESIGN' && ['PRODUCTION', 'READY', 'COMPLETED'].includes(pipelineDetail.currentPhase)) ||
                            (p === 'PRODUCTION' && ['READY', 'COMPLETED'].includes(pipelineDetail.currentPhase));

                          return (
                            <div key={p} style={{ flex: 1, height: 12, background: isActive ? getPhaseColor(p) : 'var(--bg-primary)', borderRadius: 2 }} />
                          );
                       })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
                       {/* Left Column: Jobs & Design */}
                       <div>
                          <h4 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                             <i className="ti ti-palette" style={{ color: 'var(--accent-purple)' }} /> Design Status
                          </h4>
                          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)', marginBottom: 24 }}>
                             <div className="flex justify-between items-start">
                                <div className="flex gap-16">
                                   {pipelineDetail.design.thumbnailUrl && (
                                     <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }}>
                                        <img src={pipelineDetail.design.thumbnailUrl} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                     </div>
                                   )}
                                   <div>
                                      <div style={{ fontWeight: 700, fontSize: 16 }}>{pipelineDetail.design.status.toUpperCase()}</div>
                                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{pipelineDetail.design.pageCount} items in Penpot</div>
                                      {pipelineDetail.design.penpotUrl && (
                                         <a href={pipelineDetail.design.penpotUrl} target="_blank" className="btn-apple ghost sm" style={{ padding: '0', height: 'auto', marginTop: 8, color: 'var(--accent-blue)' }}>
                                            Open Canvas <i className="ti ti-external-link" />
                                         </a>
                                      )}
                                   </div>
                                </div>
                             </div>
                          </div>

                          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                             <i className="ti ti-printer" style={{ color: 'var(--accent-blue)' }} /> Production Jobs
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                             {pipelineDetail.production.jobs.map((job: any) => (
                               <div key={job.jobId} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
                                  <div className="flex justify-between items-center mb-8">
                                     <span style={{ fontWeight: 700, fontSize: 14 }}>{job.productType.toUpperCase()}</span>
                                     <span className={`badge-apple ${job.status === 'QUEUED' ? 'blue' : 'green'}`} style={{ fontSize: 10 }}>{job.status}</span>
                                  </div>
                                  <div className="flex justify-between items-center mb-12" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                     <span>{job.dimensions}</span>
                                     <span><i className="ti ti-printer" /> {job.printer || 'Unassigned'}</span>
                                  </div>

                                  <div className="flex gap-8">
                                     {job.status === 'QC_CHECK' && (
                                       <button className="btn-apple secondary sm" style={{ flex: 1, color: 'var(--accent-red)', borderColor: 'var(--accent-red-soft)' }} onClick={() => handleQcFail(job.jobId)}>
                                          QC Fail
                                       </button>
                                     )}
                                     {['READY', 'PACKAGING', 'COMPLETED'].includes(job.status) && (
                                       <button className="btn-apple secondary sm" style={{ flex: 1 }} onClick={() => handlePrintLabel(job.jobId)}>
                                          <i className="ti ti-printer" /> Print Label
                                       </button>
                                     )}
                                  </div>
                               </div>
                             ))}
                             {pipelineDetail.production.jobs.length === 0 && (
                               <div style={{ padding: 12, border: '2px dashed var(--border-primary)', borderRadius: 12, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                                  No jobs created yet.
                               </div>
                             )}
                          </div>
                       </div>

                       {/* Right Column: Timeline & QR */}
                       <div>
                          <div style={{ background: 'var(--bg-primary)', padding: 20, borderRadius: 16, textAlign: 'center', marginBottom: 24 }}>
                             <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 12 }}>Order QR Code</div>
                             <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, marginBottom: 8, color: 'var(--accent-blue)' }}>{pipelineDetail.qrCode}</div>
                             <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Shelf: <strong>{pipelineDetail.intake.assignedShelf || 'NOT ASSIGNED'}</strong></div>
                          </div>

                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)' }}>Lifecycle Timeline</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                             <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--border-primary)' }} />
                             {pipelineDetail.timeline.map((t: any, i: number) => (
                               <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative' }}>
                                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'white', border: '3px solid var(--accent-blue)', flexShrink: 0, zIndex: 1 }} />
                                  <div style={{ marginTop: -2 }}>
                                     <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.event}</div>
                                     <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(t.timestamp).toLocaleString()}</div>
                                     {t.details && <div style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 500, marginTop: 2 }}>{t.details}</div>}
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div style={{ textAlign: 'center', padding: 40 }}>Failed to load detail.</div>
               )}
            </div>

            <div className="apple-modal-footer">
               <button className="btn-apple secondary" onClick={() => setSelectedOrderId(null)}>Close</button>
               {pipelineDetail?.design?.status !== 'approved' && (
                 <button className="btn-apple primary" onClick={() => alert('Approval flow coming in next step...')}>Approve Design</button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
