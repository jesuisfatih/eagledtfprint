'use client';

import type { AdminMerchantSettings } from './types';

interface ShopifyConnectionProps {
  settings: AdminMerchantSettings | null;
}

import { config } from '@/lib/config';

const API_URL = config.apiUrl;

export default function ShopifyConnection({ settings }: ShopifyConnectionProps) {
  return (
    <div className="apple-card" style={{ marginBottom: 20 }}>
      <div className="apple-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-brand-shopify" style={{ fontSize: 18 }} />
          <h3 className="apple-card-title">Shopify Connection</h3>
        </div>
        <span className="badge-apple green">Connected</span>
      </div>
      <div className="apple-card-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Store Domain</p>
            <p style={{ fontWeight: 600, fontSize: 14 }}>{settings?.shopDomain || 'Not configured'}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Last Sync</p>
            <p style={{ fontWeight: 600, fontSize: 14 }}>
              {settings?.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--border-secondary)', margin: '16px 0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>API Base URL</p>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-blue)' }}>{API_URL}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>CDN URL</p>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-blue)' }}>{API_URL.replace('api.', 'cdn.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
