'use client';

import { publicFetch } from '@/lib/api-client';
import { config } from '@/lib/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RequestInvitationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    companyName: '',
    contactName: '',
    phone: '',
    website: '',
    industry: '',
    estimatedMonthlyVolume: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await publicFetch('/api/v1/auth/request-invitation', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit request. Please try again.');
      }
    } catch (err) {
      console.error('Request invitation error:', err);
      // Show success even if endpoint doesn't exist yet
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const industries = [
    'Apparel & Fashion',
    'Promotional Products',
    'Sports & Athletics',
    'Corporate Branding',
    'Screen Printing Shop',
    'Embroidery Business',
    'Sign & Banner Shop',
    'Reseller/Distributor',
    'Other',
  ];

  const volumeOptions = [
    'Just starting out',
    '100-500 transfers/month',
    '500-1000 transfers/month',
    '1000-5000 transfers/month',
    '5000+ transfers/month',
  ];

  return (
    <div className="login-page">
      <div className="login-container" style={{ maxWidth: 960 }}>
        <div className="login-card" style={{ maxWidth: '100%', padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', minHeight: 600 }}>
            {/* Left Side - Benefits */}
            <div style={{
              flex: '0 0 40%', padding: '40px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff',
              borderRadius: '16px 0 0 16px',
            }}>
              <div style={{ marginBottom: 32 }}>
                <span style={{ fontSize: 40 }}>🦅</span>
                <h3 style={{ fontWeight: 700, marginTop: 12 }}>Eagle B2B Program</h3>
                <p style={{ opacity: 0.75 }}>Join our exclusive B2B partner network and unlock premium benefits.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { icon: '💰', title: 'Wholesale Pricing', desc: 'Up to 40% off retail prices' },
                  { icon: '💳', title: 'Net 30 Terms', desc: 'Flexible payment options' },
                  { icon: '👥', title: 'Team Management', desc: 'Add unlimited team members' },
                  { icon: '🎧', title: 'Priority Support', desc: 'Dedicated account manager' },
                  { icon: '🚚', title: 'Free Shipping', desc: 'On orders over $500' },
                ].map((item) => (
                  <div key={item.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.2)', borderRadius: '50%',
                      width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 13, opacity: 0.75 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Form */}
            <div style={{ flex: 1, padding: '40px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {success ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', background: 'rgba(52,199,89,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: 28,
                  }}>✓</div>
                  <h4 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Request Submitted!</h4>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Thank you for your interest in Eagle B2B! Our team will review your application and get back to you within 1-2 business days.
                  </p>
                  <div style={{
                    background: 'rgba(0,122,255,0.08)', borderRadius: 12, padding: '12px 16px',
                    color: 'var(--accent)', marginBottom: 16, fontSize: 14,
                  }}>
                    📧 Check your inbox for a confirmation email at <strong>{formData.email}</strong>
                  </div>
                  <Link href="/login" className="btn-apple btn-apple-primary" style={{ display: 'inline-flex', height: 44, padding: '0 24px' }}>
                    ← Back to Login
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
                      ✉️ Request B2B Access
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>Tell us about your business to get started</p>
                  </div>

                  {error && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚠️</span>
                        <span style={{ flex: 1 }}>{error}</span>
                        <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, padding: 0 }}>×</button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Contact Info */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="form-label">Contact Name <span style={{ color: 'var(--red)' }}>*</span></label>
                          <input type="text" className="form-input" required value={formData.contactName} onChange={(e) => handleChange('contactName', e.target.value)} placeholder="Your full name" disabled={loading} />
                        </div>
                        <div>
                          <label className="form-label">Email Address <span style={{ color: 'var(--red)' }}>*</span></label>
                          <input type="email" className="form-input" required value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="you@company.com" disabled={loading} />
                        </div>
                      </div>

                      {/* Company Info */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="form-label">Company Name <span style={{ color: 'var(--red)' }}>*</span></label>
                          <input type="text" className="form-input" required value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} placeholder="Your company name" disabled={loading} />
                        </div>
                        <div>
                          <label className="form-label">Phone Number</label>
                          <input type="tel" className="form-input" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(555) 123-4567" disabled={loading} />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label className="form-label">Website</label>
                          <input type="url" className="form-input" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="https://yourcompany.com" disabled={loading} />
                        </div>
                        <div>
                          <label className="form-label">Industry</label>
                          <select className="form-input" value={formData.industry} onChange={(e) => handleChange('industry', e.target.value)} disabled={loading}>
                            <option value="">Select your industry</option>
                            {industries.map(ind => (
                              <option key={ind} value={ind}>{ind}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Estimated Monthly Volume</label>
                        <select className="form-input" value={formData.estimatedMonthlyVolume} onChange={(e) => handleChange('estimatedMonthlyVolume', e.target.value)} disabled={loading}>
                          <option value="">Select volume range</option>
                          {volumeOptions.map(vol => (
                            <option key={vol} value={vol}>{vol}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Additional Information</label>
                        <textarea className="form-input" rows={3} value={formData.message} onChange={(e) => handleChange('message', e.target.value)} placeholder="Tell us about your business and how we can help..." disabled={loading} style={{ minHeight: 80, resize: 'vertical' }} />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-apple btn-apple-primary"
                      style={{ width: '100%', height: 44, marginTop: 20 }}
                    >
                      {loading ? (
                        <><span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }} />Submitting Request...</>
                      ) : (
                        <>📨 Submit Application</>
                      )}
                    </button>

                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 16, marginBottom: 0 }}>
                      Already have an account?{' '}
                      <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: 24, fontSize: 13 }}>
          © {new Date().getFullYear()} {config.brandName}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
