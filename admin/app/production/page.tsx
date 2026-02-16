'use client';

import { adminFetch } from '@/lib/api-client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface KanbanJob {
  id: string;
  orderNumber: string;
  companyName: string;
  email: string;
  productType: string;
  dimensions: string;
  area: number;
  priority: 'STANDARD' | 'RUSH' | 'SAME_DAY' | 'NEXT_DAY';
  printer: string | null;
  operator: string | null;
  queuedAt: string;
  estimatedReadyAt: string | null;
  isOverdue: boolean;
  waitingMinutes: number;
}

type KanbanBoard = Record<string, KanbanJob[]>;

interface Printer {
  id: string;
  name: string;
  model: string;
  status: 'IDLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE';
  inkCyan?: number;
  inkMagenta?: number;
  inkYellow?: number;
  inkBlack?: number;
  inkWhite?: number;
}

const COLUMNS = [
  { id: 'QUEUED', title: 'Queued', icon: 'ti-list' },
  { id: 'PREPRESS', title: 'Pre-Press', icon: 'ti-edit' },
  { id: 'PRINTING', title: 'Printing', icon: 'ti-printer' },
  { id: 'CURING', title: 'Curing', icon: 'ti-flame' },
  { id: 'CUTTING', title: 'Cutting', icon: 'ti-scissors' },
  { id: 'QC_CHECK', title: 'Quality Control', icon: 'ti-clipboard-check' },
  { id: 'PACKAGING', title: 'Packaging', icon: 'ti-package' },
  { id: 'READY', title: 'Ready', icon: 'ti-circle-check' },
  { id: 'PICKED_UP', title: 'Picked Up', icon: 'ti-hand-finger' },
  { id: 'SHIPPED', title: 'Shipped', icon: 'ti-truck' },
  { id: 'COMPLETED', title: 'Completed', icon: 'ti-check' },
  { id: 'CANCELLED', title: 'Cancelled', icon: 'ti-x' },
];

export default function ProductionKanbanPage() {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    try {
      const [boardRes, printersRes] = await Promise.all([
        adminFetch('/api/v1/production/board'),
        adminFetch('/api/v1/production/printers'),
      ]);
      if (boardRes.ok) setBoard(await boardRes.json());
      if (printersRes.ok) setPrinters(await printersRes.json());
    } catch (err) {
      console.error('Failed to load production data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
    const interval = setInterval(loadBoard, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadBoard]);

  const moveJob = async (jobId: string, newStatus: string) => {
    setUpdatingId(jobId);
    try {
      const res = await adminFetch(`/api/v1/production/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadBoard();
      }
    } catch (err) {
      console.error('Failed to move job', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const assignPrinter = async (jobId: string, printerId: string) => {
    setUpdatingId(jobId);
    try {
      const res = await adminFetch(`/api/v1/production/jobs/${jobId}/assign-printer`, {
        method: 'PATCH',
        body: JSON.stringify({ printerId }),
      });
      if (res.ok) loadBoard();
    } catch (err) {
      console.error('Failed to assign printer', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !board) {
    return (
      <div className="p-8">
        <h1 className="page-title">Production Kanban</h1>
        <p className="page-subtitle">Loading manufacturing pipeline...</p>
        <div className="kanban-board mt-24">
          {COLUMNS.map(col => (
            <div key={col.id} className="kanban-column">
               <div className="kanban-column-header">
                 <div className="skeleton" style={{ width: 100, height: 16 }} />
               </div>
               <div className="kanban-items">
                 <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
                 <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Production & Factory Floor</h1>
          <p className="page-subtitle">12-Stage Manufacturing Pipeline (Real-Time)</p>
        </div>
        <div className="page-header-actions">
          <div className="flex gap-12">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Factory Status</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-green)' }}>● Operating Nominal</div>
            </div>
            <button className="btn-apple secondary" onClick={loadBoard}>
              <i className="ti ti-refresh" />
            </button>
          </div>
        </div>
      </div>

      {/* Printer Fleet Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        {printers.map(p => (
           <div key={p.id} className="apple-card" style={{ padding: '12px 16px' }}>
              <div className="flex justify-between items-center mb-8">
                 <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                 <span style={{ fontSize: 10, fontWeight: 700, color: p.status === 'PRINTING' ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                    ● {p.status}
                 </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                 {[
                   { c: 'cyan', v: p.inkCyan }, { c: 'magenta', v: p.inkMagenta },
                   { c: 'yellow', v: p.inkYellow }, { c: 'black', v: p.inkBlack }, { c: 'white', v: p.inkWhite }
                 ].map(i => (
                    <div key={i.c} style={{ flex: 1, height: 24, background: 'var(--bg-primary)', borderRadius: 4, position: 'relative', overflow: 'hidden', border: '1px solid var(--border-secondary)' }}>
                       <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${i.v ?? 0}%`, background: i.c === 'white' ? '#ddd' : i.c }} />
                    </div>
                 ))}
              </div>
           </div>
        ))}
      </div>

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const jobs = board?.[col.id] || [];
          return (
            <div key={col.id} className="kanban-column">
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <i className={`ti ${col.icon}`} style={{ opacity: 0.6 }} />
                  {col.title}
                </div>
                <div className="kanban-column-count">{jobs.length}</div>
              </div>
              <div className="kanban-items">
                {jobs.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', opacity: 0.3, fontSize: 12 }}>Empty</div>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id} className="kanban-item">
                      <div className={`item-priority-line ${job.priority}`} />
                      <div className="flex justify-between items-center">
                        <span className="kanban-item-id">#{job.orderNumber}</span>
                        {job.priority !== 'STANDARD' && (
                          <span className={`badge-apple ${job.priority === 'RUSH' ? 'danger' : 'warning'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                            {job.priority}
                          </span>
                        )}
                      </div>
                      <div className="kanban-item-title">{job.companyName || 'Retail Customer'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {job.productType.toUpperCase()} · {job.dimensions}
                      </div>

                      <div className="kanban-item-meta">
                        <div className="kanban-item-meta-item">
                          <i className="ti ti-clock" />
                          <span>{job.waitingMinutes}m</span>
                        </div>
                        <div className="kanban-item-meta-item">
                           <i className="ti ti-printer" />
                           <select
                             value={job.printer || ''}
                             onChange={(e) => assignPrinter(job.id, e.target.value)}
                             style={{ background: 'none', border: 'none', fontSize: 12, color: 'inherit', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                           >
                             <option value="">Unassigned</option>
                             {printers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                           </select>
                        </div>
                      </div>

                      {/* Transition Actions */}
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-secondary)', display: 'flex', gap: 6 }}>
                        <button
                          className="btn-apple ghost small"
                          style={{ flex: 1, fontSize: 11, padding: '4px 0' }}
                          onClick={() => {
                            const nextIdx = COLUMNS.findIndex(c => c.id === col.id) + 1;
                            if (nextIdx < COLUMNS.length - 1) moveJob(job.id, COLUMNS[nextIdx].id);
                          }}
                          disabled={updatingId === job.id || col.id === 'COMPLETED' || col.id === 'CANCELLED'}
                        >
                          {updatingId === job.id ? '...' : col.id === 'READY' ? 'Logistics →' : 'Next →'}
                        </button>
                        <Link href={`/orders/${job.id}`} className="btn-apple ghost small" style={{ width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="ti ti-external-link" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
