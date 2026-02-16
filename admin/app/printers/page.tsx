'use client';

import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface Printer {
  id: string;
  name: string;
  model: string;
  status: 'IDLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE';
  inkCyan: number;
  inkMagenta: number;
  inkYellow: number;
  inkBlack: number;
  inkWhite: number;
  lastMaintenanceAt: string;
}

export default function PrintersPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPrinters = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/production/printers');
      if (res.ok) {
        const data = await res.json();
        setPrinters(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrinters(); }, [loadPrinters]);

  const InkBar = ({ label, color, level }: { label: string, color: string, level: number }) => (
    <div style={{ marginBottom: 12 }}>
      <div className="flex justify-between items-center mb-4" style={{ fontSize: 11, fontWeight: 600 }}>
        <span>{label}</span>
        <span>{level}%</span>
      </div>
      <div style={{ height: 24, background: 'var(--bg-primary)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-primary)', position: 'relative' }}>
        <div style={{
          height: '100%', width: `${level}%`, background: color,
          transition: 'width 1s ease-in-out',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)'
        }} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Printer Fleet</h1>
          <p className="page-subtitle">Monitoring ink levels and hardware health</p>
        </div>
        <div className="page-header-actions">
           <button className="btn-apple primary">
             <i className="ti ti-plus" /> Add Printer
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
        {loading ? (
          <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />
        ) : printers.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
             <i className="ti ti-printer" className="empty-state-icon" />
             <h3 className="empty-state-title">No printers configured</h3>
          </div>
        ) : (
          printers.map(p => (
            <div key={p.id} className="apple-card" style={{ padding: 24 }}>
              <div className="flex justify-between items-start mb-20">
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{p.name}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.model}</div>
                </div>
                <span className={`badge-apple ${p.status === 'PRINTING' ? 'success' : p.status === 'MAINTENANCE' ? 'warning' : 'info'}`}>
                  {p.status}
                </span>
              </div>

              <div style={{ padding: '16px 0', borderTop: '1px solid var(--border-secondary)' }}>
                 <InkBar label="Cyan" color="#00adef" level={p.inkCyan} />
                 <InkBar label="Magenta" color="#ec008c" level={p.inkMagenta} />
                 <InkBar label="Yellow" color="#fff200" level={p.inkYellow} />
                 <InkBar label="Black" color="#000000" level={p.inkBlack} />
                 <InkBar label="White" color="#ffffff" level={p.inkWhite} />
              </div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-secondary)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                Last Maintenance: {new Date(p.lastMaintenanceAt).toLocaleDateString()}
              </div>

              <div className="flex gap-8 mt-16">
                 <button className="btn-apple secondary sm" style={{ flex: 1 }}>Maintain</button>
                 <button className="btn-apple secondary sm" style={{ flex: 1 }}>Logs</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
