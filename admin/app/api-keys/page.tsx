'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/api-client';
import { PageHeader, showToast } from '@/components/ui';
import Modal from '@/components/Modal';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{show: boolean; key: ApiKey | null}>({show: false, key: null});
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/v1/api-keys');
      if (res.ok) { const d = await res.json(); setKeys(d.keys || d.data || d || []); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await adminFetch('/api/v1/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: `API Key ${keys.length + 1}` }),
      });
      if (res.ok) { showToast('API key generated!', 'success'); loadKeys(); }
      else showToast('Failed to generate', 'danger');
    } catch { showToast('Error generating key', 'danger'); }
    finally { setGenerating(false); }
  };

  const deleteKey = async (key: ApiKey) => {
    setDeleteModal({show: false, key: null});
    try {
      const res = await adminFetch(`/api/v1/api-keys/${key.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('API key deleted', 'success'); loadKeys(); }
      else showToast('Failed to delete', 'danger');
    } catch { showToast('Error deleting key', 'danger'); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showToast('Copied to clipboard', 'success');
  };

  return (
    <div>
      <PageHeader title="API Keys" subtitle="Manage API access keys"
        actions={[{ label: generating ? 'Generating...' : 'Generate Key', icon: 'plus', variant: 'primary', onClick: generateKey, disabled: generating }]} />

      <div className="apple-alert warning" style={{ marginBottom: 20 }}>
        <i className="ti ti-alert-triangle" />
        <span>API keys grant full access. Keep them secure and never share publicly.</span>
      </div>

      <div className="apple-card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} /></div>
        ) : keys.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon"><i className="ti ti-key" /></div>
            <h4 className="empty-state-title">No API keys</h4>
            <p className="empty-state-desc">Generate a key to start using the API.</p>
          </div>
        ) : (
          <table className="apple-table">
            <thead><tr><th>Name</th><th>Key</th><th>Created</th><th>Last Used</th><th>Actions</th></tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td style={{ fontWeight: 500 }}>{k.name}</td>
                  <td><code style={{ fontSize: 12, background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>{k.key.substring(0, 20)}...</code></td>
                  <td style={{ fontSize: 13 }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-apple ghost small" onClick={() => copyKey(k.key)}><i className="ti ti-copy" /></button>
                      <button className="btn-apple danger small" onClick={() => setDeleteModal({show: true, key: k})}><i className="ti ti-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteModal.show && deleteModal.key && (
        <Modal show onClose={() => setDeleteModal({show: false, key: null})} onConfirm={() => deleteKey(deleteModal.key!)}
          title="Delete API Key" message={`Delete "${deleteModal.key.name}"? This action cannot be undone.`} confirmText="Delete" type="danger" />
      )}
    </div>
  );
}

