'use client';

import { publicFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await publicFetch('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to reset password. The link may have expired.');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Connection error. Please try again.');
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
                  <h3 className="fw-bold mb-1">Reset Password</h3>
                  <p className="text-muted">Enter your new password below</p>
                </div>

                {success ? (
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="d-inline-flex align-items-center justify-content-center bg-success bg-opacity-10 rounded-circle mb-3" style={{ width: 80, height: 80 }}>
                        <i className="ti ti-check ti-2x text-success"></i>
                      </div>
                    </div>
                    <h5 className="fw-bold mb-2">Password Reset Successful!</h5>
                    <p className="text-muted mb-4">
                      Your password has been changed. You can now log in with your new password.
                    </p>
                    <Link href="/login" className="btn btn-primary w-100">
                      <i className="ti ti-login me-2"></i>
                      Go to Login
                    </Link>
                  </div>
                ) : !token ? (
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 rounded-circle mb-3" style={{ width: 80, height: 80 }}>
                        <i className="ti ti-link-off ti-2x text-danger"></i>
                      </div>
                    </div>
                    <h5 className="fw-bold mb-2">Invalid Reset Link</h5>
                    <p className="text-muted mb-4">
                      This password reset link is invalid or has expired.
                    </p>
                    <Link href="/forgot-password" className="btn btn-primary w-100">
                      <i className="ti ti-mail-forward me-2"></i>
                      Request New Reset Link
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
                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          <i className="ti ti-lock me-1"></i>New Password
                        </label>
                        <div className="input-group">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-control form-control-lg"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password"
                            disabled={loading}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                          >
                            <i className={`ti ti-eye${showPassword ? '-off' : ''}`}></i>
                          </button>
                        </div>
                        <small className="text-muted">
                          At least 8 characters with uppercase, lowercase, and number
                        </small>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold">
                          <i className="ti ti-lock-check me-1"></i>Confirm Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-control form-control-lg"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          disabled={loading}
                          autoComplete="new-password"
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
                            Resetting...
                          </>
                        ) : (
                          <>
                            <i className="ti ti-check me-2"></i>
                            Reset Password
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

function LoadingFallback() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="text-center text-white">
        <div className="spinner-border mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
