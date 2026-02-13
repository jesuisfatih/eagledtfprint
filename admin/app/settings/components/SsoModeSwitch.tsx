'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/api-client';
import { showToast } from '@/components/ui';

export default function SsoModeSwitch() {
  const [multipassMode, setMultipassMode] = useState(false);
  const [multipassSecret, setMultipassSecret] = useState('');
  const [storefrontToken, setStorefrontToken] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const response = await adminFetch('/api/v1/settings/sso');
      if (response.ok) {
        const data = await response.json();
        setMultipassMode(data.mode === 'multipass');
        setMultipassSecret(data.multipassSecret || '');
        setStorefrontToken(data.storefrontToken || '');
      }
    } catch (err) { console.error(err); }
  };

  const handleToggle = async (enabled: boolean) => {
    const previousMode = multipassMode;
    setMultipassMode(enabled);
    setLoading(true);
    try {
      const response = await adminFetch('/api/v1/settings/sso', {
        method: 'PUT',
        body: JSON.stringify({
          mode: enabled ? 'multipass' : 'alternative',
          multipassSecret: enabled ? multipassSecret : '',
          storefrontToken: !enabled ? storefrontToken : '',
        }),
      });
      if (!response.ok) { setMultipassMode(previousMode); throw new Error(`Failed: ${response.status}`); }
      const data = await response.json();
      setMultipassMode(data.mode === 'multipass');
      showToast(`SSO mode changed to: ${enabled ? 'Multipass' : 'Alternative'}`, 'success');
    } catch (err) {
      setMultipassMode(previousMode);
      showToast(`Failed to update SSO settings: ${err instanceof Error ? err.message : 'Unknown error'}`, 'danger');
    } finally { setLoading(false); }
  };

  return (
    <div className="apple-card" style={{ marginBottom: 20 }}>
      <div className="apple-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-lock" style={{ fontSize: 18 }} />
          <h3 className="apple-card-title">SSO Configuration</h3>
        </div>
      </div>
      <div className="apple-card-body">
        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
          <label className="apple-toggle" style={{ marginTop: 2 }}>
            <input type="checkbox" checked={multipassMode} onChange={e => handleToggle(e.target.checked)} disabled={loading} />
            <span className="toggle-slider" />
          </label>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Shopify Multipass SSO</span>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {multipassMode ? '✅ Multipass enabled (Shopify Plus required)' : '⚙️ Alternative SSO (Standard Shopify compatible)'}
            </p>
          </div>
        </div>

        {multipassMode ? (
          <>
            <div className="apple-alert warning" style={{ marginBottom: 16 }}>
              <i className="ti ti-alert-triangle" />
              <div>
                <strong>Shopify Plus Required</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                  Multipass is only available on Shopify Plus plans ($2000/month).
                  Enable it in: Shopify Admin → Settings → Customer accounts → Multipass
                </p>
              </div>
            </div>
            <div>
              <label className="input-label">Multipass Secret (64 characters)</label>
              <input className="input-apple" type="password" placeholder="a1b2c3d4e5f6..." style={{ fontFamily: 'monospace' }}
                value={multipassSecret} onChange={e => setMultipassSecret(e.target.value)} />
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Get from: Shopify Admin → Settings → Customer accounts → Multipass
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="apple-alert info" style={{ marginBottom: 16 }}>
              <i className="ti ti-info-circle" />
              <div>
                <strong>Alternative SSO Active</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                  Cookie-based authentication with Shopify Customer API.
                  Works on all Shopify plans including Standard ($29/month).
                </p>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label className="input-label">Session Cookie Domain</label>
              <input className="input-apple" type="text" value=".eagledtfsupply.com" readOnly disabled />
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Cross-subdomain cookie for seamless auth</p>
            </div>
            <div>
              <label className="input-label">Shopify Storefront Access Token</label>
              <input className="input-apple" type="password" placeholder="Storefront API token" style={{ fontFamily: 'monospace' }}
                value={storefrontToken} onChange={e => setStorefrontToken(e.target.value)} />
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Required for checkout creation</p>
            </div>
          </>
        )}

        <div className="apple-alert success" style={{ marginTop: 20 }}>
          <i className="ti ti-check" />
          <div>
            <strong>System Status</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12 }}>
              <li>Shopify → Eagle sync: Active</li>
              <li>Eagle → Shopify sync: Active</li>
              <li>Checkout flow: Configured</li>
              <li>Customer mapping: Enabled</li>
              <li>Mode: {multipassMode ? 'Multipass (Plus)' : 'Alternative (Standard)'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

