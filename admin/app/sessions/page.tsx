'use client';

import Modal from '@/components/Modal';
import { PageHeader, showToast } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface Session {
  id: string;
  userId: string;
  userName: string;
  email: string;
  ip: string;
  userAgent: string;
  lastActivity: string;
  createdAt: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutModal, setLogoutModal] = useState<{show: boolean; session: Session | null}>({show: false, session: null});

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/v1/events/session-activity');
      if (res.ok) { const d = await res.json(); setSessions(d.sessions || d.data || d || []); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const forceLogout = async (session: Session) => {
    setLogoutModal({show: false, session: null});
    try {
      const res = await adminFetch(`/api/v1/sessions/${session.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('Session terminated', 'success'); loadSessions(); }
      else showToast('Failed to terminate session', 'danger');
    } catch { showToast('Error terminating session', 'danger'); }
  };

  return (
    <div>
      <PageHeader title="Active Sessions" subtitle={`${sessions.length} active sessions`}
        actions={[{ label: 'Refresh', icon: 'refresh', variant: 'secondary', onClick: loadSessions }]} />
      <div className="apple-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} /></div>
        ) : sessions.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon"><i className="ti ti-device-desktop" /></div>
            <h4 className="empty-state-title">No active sessions</h4>
          </div>
        ) : (
          <table className="apple-table">
            <thead><tr><th>User</th><th>IP</th><th>Device</th><th>Last Activity</th><th>Actions</th></tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{s.userName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s.email}</div>
                  </td>
                  <td><span className="badge-apple info">{s.ip}</span></td>
                  <td style={{ fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.userAgent}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{new Date(s.lastActivity || s.createdAt).toLocaleString()}</td>
                  <td><button className="btn-apple danger small" onClick={() => setLogoutModal({show: true, session: s})}><i className="ti ti-logout" /> End</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {logoutModal.show && logoutModal.session && (
        <Modal show onClose={() => setLogoutModal({show: false, session: null})} onConfirm={() => forceLogout(logoutModal.session!)}
          title="End Session" message={`This will force logout ${logoutModal.session.userName}.`} confirmText="End Session" type="danger" />
      )}
    </div>
  );
}
