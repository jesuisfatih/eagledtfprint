'use client';

import { PageHeader } from '@/components/ui';
import { adminFetch } from '@/lib/api-client';
import { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user?: string;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/v1/events/admin-activity?limit=50');
        if (res.ok) { const d = await res.json(); setActivities(d.activities || d.data || []); }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, []);

  const typeIcons: Record<string, { icon: string; color: string }> = {
    order: { icon: 'ti-shopping-cart', color: '#007aff' },
    company: { icon: 'ti-building', color: '#34c759' },
    user: { icon: 'ti-user', color: '#5856d6' },
    sync: { icon: 'ti-refresh', color: '#ff9500' },
    pricing: { icon: 'ti-discount', color: '#ff3b30' },
  };

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Recent platform activity" />
      <div className="apple-card">
        <div className="apple-card-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} />
            </div>
          ) : activities.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <div className="empty-state-icon"><i className="ti ti-activity" /></div>
              <h4 className="empty-state-title">No activity yet</h4>
              <p className="empty-state-desc">Activity will appear here as users interact with the platform.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activities.map((a, i) => {
                const t = typeIcons[a.type] || { icon: 'ti-activity', color: '#8e8e93' };
                return (
                  <div key={a.id || i} style={{
                    display: 'flex', gap: 16, padding: '16px 0',
                    borderBottom: i < activities.length - 1 ? '1px solid var(--border-light)' : 'none',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.color}14`, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${t.icon}`} style={{ fontSize: 18 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{a.description}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {a.user && <span>{a.user} · </span>}
                        {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
