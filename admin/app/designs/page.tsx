'use client';

import { adminFetch } from '@/lib/api-client';
import { useCallback, useEffect, useState } from 'react';

interface DesignProject {
  id: string;
  projectName: string;
  orderNumber: string;
  companyName: string;
  fileCount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFICATION_NEEDED';
  previewUrl?: string;
  createdAt: string;
  dimensions?: string;
  dpi?: number;
}

export default function DesignProjectsPage() {
  const [projects, setProjects] = useState<DesignProject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const res = await adminFetch('/api/v1/penpot/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to load design projects', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Design Management</h1>
          <p className="page-subtitle">Penpot Integration — PNG Extraction & DPI Verification</p>
        </div>
        <div className="page-header-actions">
           <button className="btn-apple primary" onClick={loadProjects}>
             <i className="ti ti-refresh" /> Refresh
           </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24, marginTop: 24 }}>
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 380, borderRadius: 20 }} />)
        ) : projects.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
             <i className="ti ti-palette" className="empty-state-icon" />
             <h3 className="empty-state-title">No design projects found</h3>
          </div>
        ) : (
          projects.map(p => (
            <div key={p.id} className="apple-card" style={{ padding: 0 }}>
              <div style={{
                height: 200, background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
              }}>
                {p.previewUrl ? (
                  <img src={p.previewUrl} alt={p.projectName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <i className="ti ti-photo" style={{ fontSize: 64, color: 'var(--text-quaternary)' }} />
                )}
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <span className={`badge-apple ${p.status === 'APPROVED' ? 'success' : 'warning'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Order #{p.orderNumber}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0' }}>{p.projectName}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{p.companyName}</div>

                <div className="flex justify-between items-center mt-16" style={{ background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 12 }}>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-quaternary)', textTransform: 'uppercase' }}>DPI</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: p.dpi && p.dpi >= 300 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{p.dpi || '???'}</div>
                   </div>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-quaternary)', textTransform: 'uppercase' }}>Size</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.dimensions || '22" × 24"'}</div>
                   </div>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-quaternary)', textTransform: 'uppercase' }}>Files</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.fileCount}</div>
                   </div>
                </div>

                <div className="flex gap-8 mt-16">
                   <button className="btn-apple primary" style={{ flex: 1 }}>Approve</button>
                   <button className="btn-apple secondary" style={{ flex: 1 }}>Edit in Penpot</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
