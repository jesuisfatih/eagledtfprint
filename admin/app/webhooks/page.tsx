'use client';

import { PageHeader, StatusBadge } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface WebhookLog {
  id: string;
  topic: string;
  status: string;
  createdAt: string;
  payload?: string;
}

export default function WebhooksPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/v1/events/webhook-activity');
        if (res.ok) { const d = await res.json(); setLogs(d.logs || d.data || d || []); }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <PageHeader title="Webhook Logs" subtitle="Incoming webhook events" />
      <div className="apple-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon"><i className="ti ti-webhook" /></div>
            <h4 className="empty-state-title">No webhook logs</h4>
            <p className="empty-state-desc">Webhook events will appear here.</p>
          </div>
        ) : (
          <table className="apple-table">
            <thead><tr><th>Topic</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.topic}</td>
                  <td><StatusBadge status={l.status} colorMap={{ success: 'success', failed: 'danger', pending: 'warning' }} /></td>
                  <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
