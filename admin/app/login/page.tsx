'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { config } from '@/lib/config';

const API_URL = config.apiUrl;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle OAuth callback token from URL
  useEffect(() => {
    const token = searchParams.get('token');
    const shop = searchParams.get('shop');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(`OAuth failed: ${searchParams.get('message') || oauthError}`);
      return;
    }

    if (token) {
      // Auto-login with OAuth token
      localStorage.setItem('eagle_admin_token', token);
      if (shop) {
        localStorage.setItem('eagle_shop_domain', shop);
      }
      router.push('/dashboard');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();
      localStorage.setItem('eagle_admin_token', data.access_token || data.token);
      if (data.merchantId) {
        localStorage.setItem('eagle_merchantId', data.merchantId);
      }
      router.push('/dashboard');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card" style={{ maxWidth: 400, width: '100%' }}>
        <div className="login-logo">🦅</div>
        <h2 style={{ textAlign: 'center', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)', marginBottom: 4 }}>
          Eagle B2B Admin
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14, marginBottom: 28 }}>
          Sign in to manage your B2B platform
        </p>

        {error && (
          <div className="apple-alert danger" style={{ marginBottom: 16 }}>
            <i className="ti ti-alert-circle" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="input-label" htmlFor="username">Username</label>
            <div className="input-apple">
              <i className="ti ti-user input-icon" />
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="input-label" htmlFor="password">Password</label>
            <div className="input-apple">
              <i className="ti ti-lock input-icon" />
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-apple primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-loader-2 spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
