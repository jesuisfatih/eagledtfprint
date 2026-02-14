'use client';

import { showToast } from '@/components/ui';
import type { AdminMerchantSettings } from './types';

interface SnippetIntegrationProps {
  settings: AdminMerchantSettings | null;
}

import { config } from '@/lib/config';

export default function SnippetIntegration({ settings }: SnippetIntegrationProps) {
  const apiUrl = config.apiUrl;
  const cdnUrl = config.cdnUrl;
  const snippetCode = settings?.shopDomain
    ? `<script src="${cdnUrl}/snippet.iife.js" data-api-url="${apiUrl}" data-shop="${settings.shopDomain}"></script>`
    : '';

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippetCode);
      showToast('Snippet copied to clipboard!', 'success');
    } catch {
      showToast('Failed to copy', 'danger');
    }
  };

  const themeAppExtensionGuide = `1. Go to your Shopify Admin → Online Store → Themes\n2. Click "Customize" on your active theme\n3. Go to Theme Settings → App Embeds\n4. Enable "Eagle B2B" app embed\n5. Save changes`;

  return (
    <div className="apple-card" style={{ marginBottom: 20 }}>
      <div className="apple-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-code" style={{ fontSize: 18 }} />
          <h3 className="apple-card-title">Snippet Integration</h3>
        </div>
      </div>
      <div className="apple-card-body">
        {/* Option 1 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="badge-apple blue">Option 1</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Script Tag (Recommended)</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            Add this snippet to your Shopify theme layout.liquid file, before the closing &lt;/body&gt; tag.
          </p>
          <div className="code-block" style={{ marginBottom: 12 }}>
            {snippetCode || 'Configure shop domain first'}
          </div>
          <button onClick={copySnippet} className="btn-apple secondary" disabled={!snippetCode}>
            <i className="ti ti-copy" /> Copy to Clipboard
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--border-secondary)', margin: '20px 0' }} />

        {/* Option 2 */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="badge-apple gray">Option 2</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Theme App Extension</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            If the Eagle B2B app is installed, you can enable it via Theme Settings.
          </p>
          <div className="info-block">
            {themeAppExtensionGuide}
          </div>
        </div>
      </div>
    </div>
  );
}
