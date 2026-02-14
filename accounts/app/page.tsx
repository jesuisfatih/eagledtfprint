'use client';

import { config } from '@/lib/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('eagle_token');
    if (token) router.push('/dashboard');
  }, [router]);

  return (
    <div className="login-page">
      <div className="login-container" style={{ maxWidth: 860 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className="login-logo" style={{ width: 72, height: 72, fontSize: 36 }}>🦅</div>
        </div>

        {/* Hero Title */}
        <h1 style={{
          fontSize: 48, fontWeight: 800, textAlign: 'center', color: 'var(--text-primary)',
          margin: '0 0 14px', letterSpacing: '-1px', lineHeight: 1.1,
        }}>
          Eagle B2B Portal
        </h1>
        <p style={{
          fontSize: 18, textAlign: 'center', color: 'var(--text-tertiary)',
          margin: '0 0 44px', lineHeight: 1.7, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Your complete wholesale platform for DTF supplies and custom printing solutions.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 64 }}>
          <Link
            href="/login"
            className="btn-apple primary lg"
            style={{ height: 52, padding: '0 40px', fontSize: 16, textDecoration: 'none' }}
          >
            <i className="ti ti-login" /> Sign In
          </Link>
          <Link
            href="/request-invitation"
            className="btn-apple secondary lg"
            style={{ height: 52, padding: '0 40px', fontSize: 16, textDecoration: 'none' }}
          >
            <i className="ti ti-mail-forward" /> Request Access
          </Link>
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { icon: 'ti-discount-2', title: 'Wholesale Pricing', desc: 'Exclusive B2B discounts up to 40% off retail prices.', color: 'var(--green)' },
            { icon: 'ti-credit-card', title: 'Net 30 Terms', desc: 'Flexible payment options for qualified businesses.', color: 'var(--accent)' },
            { icon: 'ti-users', title: 'Team Management', desc: 'Add team members with customizable permissions.', color: 'var(--purple)' },
          ].map((f) => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)',
              padding: 32, textAlign: 'center', transition: 'all 0.3s ease',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 'var(--radius-md)', margin: '0 auto 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${f.color}18`, color: f.color,
              }}>
                <i className={`ti ${f.icon}`} style={{ fontSize: 24 }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {[
            { icon: 'ti-lock', text: 'Secure Checkout' },
            { icon: 'ti-truck', text: 'Fast Shipping' },
            { icon: 'ti-headset', text: 'Priority Support' },
          ].map((b) => (
            <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-quaternary)' }}>
              <i className={`ti ${b.icon}`} style={{ fontSize: 17 }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{b.text}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'var(--text-quaternary)', marginTop: 48, fontSize: 12 }}>
          © {new Date().getFullYear()} {config.brandName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
