'use client';

import { publicFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('eagle_token');
    if (token) router.push('/dashboard');
    const savedEmail = localStorage.getItem('eagle_remembered_email');
    if (savedEmail) { setEmail(savedEmail); setRememberMe(true); }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await publicFetch('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('eagle_token', data.accessToken || data.token);
        localStorage.setItem('eagle_userId', data.user.id);
        localStorage.setItem('eagle_companyId', data.user.companyId);
        localStorage.setItem('eagle_merchantId', data.user.merchantId || '');
        localStorage.setItem('eagle_userEmail', data.user.email);
        localStorage.setItem('eagle_userName', `${data.user.firstName} ${data.user.lastName}`);
        localStorage.setItem('eagle_userRole', data.user.role || 'member');
        localStorage.setItem('eagle_loginTime', Date.now().toString());
        if (rememberMe) localStorage.setItem('eagle_remembered_email', email);
        else localStorage.removeItem('eagle_remembered_email');
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Logo & Brand */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="login-logo">🦅</div>
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Sign in to your {config.brandName} account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 24 }}>
              <i className="ti ti-alert-circle" />
              <span style={{ flex: 1 }}>{error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 4 }}>
                <i className="ti ti-x" />
              </button>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--accent)', opacity: 0.8 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'var(--text-quaternary)', fontSize: 18,
                  }}
                >
                  <i className={`ti ti-eye${showPassword ? '-off' : ''}`} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
              />
              <label htmlFor="remember-me" style={{ fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-apple primary lg"
              style={{ width: '100%', height: 48, fontSize: 15, borderRadius: 'var(--radius-md)' }}
            >
              {loading ? (
                <><span className="spinner-apple" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0', gap: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Register Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link
              href="/register"
              className="btn-apple secondary"
              style={{ width: '100%', textAlign: 'center', height: 44, textDecoration: 'none' }}
            >
              <i className="ti ti-user-plus" /> Create Account
            </Link>
            <Link
              href="/request-invitation"
              className="btn-apple ghost"
              style={{ width: '100%', textAlign: 'center', height: 44, textDecoration: 'none', border: '1px solid var(--border)' }}
            >
              <i className="ti ti-mail-forward" /> Request B2B Access
            </Link>
          </div>

          {/* B2B Benefits */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center' }}>
              {[
                { icon: 'ti-discount-2', label: 'Bulk Discounts', color: 'var(--green)' },
                { icon: 'ti-credit-card', label: 'Net Terms', color: 'var(--accent)' },
                { icon: 'ti-users', label: 'Team Access', color: 'var(--purple)' },
              ].map(b => (
                <div key={b.label} style={{ opacity: 0.7 }}>
                  <i className={`ti ${b.icon}`} style={{ fontSize: 20, color: b.color, display: 'block', marginBottom: 6 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', color: 'var(--text-quaternary)', fontSize: 12 }}>
        © {new Date().getFullYear()} {config.brandName}. All rights reserved.
      </p>
    </div>
  );
}
