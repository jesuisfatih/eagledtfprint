'use client';

import { publicFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await publicFetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      // Show success anyway for security (don't reveal if email exists)
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6 col-xl-5">
            <div className="card shadow-lg border-0">
              <div className="card-body p-4 p-md-5">
                {/* Logo & Brand */}
                <div className="text-center mb-4">
                  <div className="d-inline-flex align-items-center justify-content-center bg-primary rounded-circle mb-3" style={{ width: 64, height: 64 }}>
                    <span className="text-white fs-2">🦅</span>
                  </div>
                  <h3 className="fw-bold mb-1">Forgot Password?</h3>
                  <p className="text-muted">No worries, we'll send you reset instructions</p>
                </div>

                {success ? (
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 rounded-circle mb-3" style={{ width: 80, height: 80 }}>
                        <i className="ti ti-mail-check ti-2x text-success"></i>
                      </div>
                    </div>
                    <h5 className="fw-bold mb-2">Check your email</h5>
                    <p className="text-muted mb-4">
                      If an account exists for <strong>{email}</strong>, we've sent password reset instructions.
                    </p>
                    <div className="alert alert-info-subtle mb-4">
                      <i className="ti ti-info-circle me-2"></i>
                      Didn't receive the email? Check your spam folder.
                    </div>
                    <Link href="/login" className="btn btn-primary w-100">
                      <i className="ti ti-arrow-left me-2"></i>
                      Back to Login
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Error Alert */}
                    {error && (
                      <div className="alert alert-danger d-flex align-items-center" role="alert">
                        <i className="ti ti-alert-circle me-2"></i>
                        <div>{error}</div>
                        <button type="button" className="btn-close ms-auto" onClick={() => setError('')}></button>
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          <i className="ti ti-mail me-1"></i>Email Address
                        </label>
                        <input
                          type="email"
                          className="form-control form-control-lg"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          disabled={loading}
                          autoComplete="email"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary btn-lg w-100 mb-3"
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Sending...
                          </>
                        ) : (
                          <>
                            <i className="ti ti-mail-forward me-2"></i>
                            Send Reset Link
                          </>
                        )}
                      </button>
                    </form>

                    <div className="text-center mt-4">
                      <Link href="/login" className="text-muted text-decoration-none">
                        <i className="ti ti-arrow-left me-1"></i>
                        Back to Login
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-white-50 mt-4 small">
              © {new Date().getFullYear()} {config.brandName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
