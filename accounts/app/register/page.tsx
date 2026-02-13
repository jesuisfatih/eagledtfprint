'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { publicFetch } from '@/lib/api-client';

type AccountType = 'b2b' | 'normal';

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Account Type & Email
    accountType: 'b2b' as AccountType,
    email: '',
    verificationCode: '',
    codeSent: false,
    emailVerified: false,
    skipEmailVerification: false,
    
    // Step 2: Personal Info
    firstName: '',
    lastName: '',
    phone: '',
    
    // Step 3: Company Info (B2B only)
    companyName: '',
    taxId: '',
    
    // Step 4: Billing Address
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    billingCountry: 'US',
    
    // Step 5: Shipping Address
    shippingSameAsBilling: true,
    shippingAddress1: '',
    shippingAddress2: '',
    shippingCity: '',
    shippingState: '',
    shippingPostalCode: '',
    shippingCountry: 'US',
    
    // Step 6: Password
    password: '',
    confirmPassword: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');

  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await publicFetch('/api/v1/auth/send-verification-code', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, codeSent: true }));
        
        // In development, show code
        if (data.code) {
          alert(`Verification code (dev): ${data.code}`);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send verification code');
      }
    } catch (err) {
      console.error('Send verification error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCodeInput || verificationCodeInput.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await publicFetch('/api/v1/auth/verify-email-code', {
        method: 'POST',
        body: JSON.stringify({ 
          email: formData.email, 
          code: verificationCodeInput 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setFormData(prev => ({ ...prev, verificationCode: verificationCodeInput, emailVerified: true }));
        } else {
          setError('Invalid verification code');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Verify code error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setError('');
    
    // Validation based on step
    if (currentStep === 1) {
      if (!formData.email) {
        setError('Email is required');
        return;
      }
      // Email verification is optional - can skip
      if (!formData.skipEmailVerification && !formData.emailVerified) {
        if (!formData.codeSent) {
          setError('Please send verification code or skip email verification');
          return;
        }
        if (!formData.verificationCode) {
          setError('Please verify your email code or skip email verification');
          return;
        }
      }
    } else if (currentStep === 2) {
      if (!formData.firstName || !formData.lastName || !formData.phone) {
        setError('All personal information fields are required');
        return;
      }
    } else if (currentStep === 3 && formData.accountType === 'b2b') {
      if (!formData.companyName) {
        setError('Company name is required for B2B accounts');
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.billingAddress1 || !formData.billingCity || !formData.billingPostalCode) {
        setError('Billing address fields are required');
        return;
      }
    } else if (currentStep === 5 && !formData.shippingSameAsBilling) {
      if (!formData.shippingAddress1 || !formData.shippingCity || !formData.shippingPostalCode) {
        setError('Shipping address fields are required');
        return;
      }
    } else if (currentStep === 6) {
      if (!formData.password || formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
      // Password complexity: uppercase, lowercase, number
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(formData.password)) {
        setError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      handleSubmit();
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await publicFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          accountType: formData.accountType,
          companyName: formData.accountType === 'b2b' ? formData.companyName : undefined,
          taxId: formData.accountType === 'b2b' ? formData.taxId : undefined,
          verificationCode: formData.emailVerified ? formData.verificationCode : undefined,
          skipEmailVerification: formData.skipEmailVerification,
          billingAddress: {
            address1: formData.billingAddress1,
            address2: formData.billingAddress2,
            city: formData.billingCity,
            state: formData.billingState,
            postalCode: formData.billingPostalCode,
            country: formData.billingCountry,
          },
          shippingAddress: formData.shippingSameAsBilling ? undefined : {
            address1: formData.shippingAddress1,
            address2: formData.shippingAddress2,
            city: formData.shippingCity,
            state: formData.shippingState,
            postalCode: formData.shippingPostalCode,
            country: formData.shippingCountry,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Show success message
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)';
        modal.innerHTML = `
          <div style="background:#fff;border-radius:16px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden">
            <div style="padding:24px 24px 0;text-align:center">
              <div style="font-size:48px;margin-bottom:12px">✅</div>
              <h3 style="font-weight:700;margin-bottom:8px">Registration Successful!</h3>
              <p style="color:#666;margin-bottom:8px"><strong>Your account has been created successfully!</strong></p>
              <p style="color:#666;margin-bottom:8px">Your account is pending admin approval. You will receive an email notification once your account is approved.</p>
              <p style="color:#666;margin-bottom:0">All your information has been synced to Shopify.</p>
            </div>
            <div style="padding:20px 24px 24px;text-align:center">
              <button onclick="this.closest('div[style]').parentElement.remove(); window.location.href='/login';" style="background:#007AFF;color:#fff;border:none;border-radius:10px;padding:10px 32px;font-size:15px;font-weight:600;cursor:pointer">Go to Login</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = formData.accountType === 'b2b' ? 6 : 5;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card" style={{ maxWidth: 520 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 40 }}>🦅</span>
            <span style={{ fontSize: 20, fontWeight: 700, marginLeft: 8, color: 'var(--text-primary)' }}>Eagle B2B</span>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Step {currentStep} of {totalSteps}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.3s ease' }} />
            </div>
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

          {/* Step 1: Account Type & Email Verification */}
          {currentStep === 1 && (
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Account Type & Email</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Choose your account type and verify your email</p>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Account Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, accountType: 'b2b' }))}
                    style={{
                      padding: 16, borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                      border: formData.accountType === 'b2b' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: formData.accountType === 'b2b' ? 'rgba(0,122,255,0.06)' : 'var(--bg-primary)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>B2B Account</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>For businesses</div>
                  </div>
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, accountType: 'normal' }))}
                    style={{
                      padding: 16, borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                      border: formData.accountType === 'normal' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: formData.accountType === 'normal' ? 'rgba(0,122,255,0.06)' : 'var(--bg-primary)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Normal Account</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>For individuals</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Email Address *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value, codeSent: false }))}
                    placeholder="your@email.com"
                    disabled={loading || formData.codeSent}
                    style={{ paddingRight: 110 }}
                  />
                  <button
                    type="button"
                    onClick={handleSendVerificationCode}
                    disabled={loading || !formData.email || formData.codeSent}
                    style={{
                      position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                      background: formData.codeSent ? 'var(--green)' : 'var(--accent)',
                      color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      opacity: (loading || !formData.email || formData.codeSent) ? 0.5 : 1,
                    }}
                  >
                    {formData.codeSent ? 'Sent ✓' : 'Send Code'}
                  </button>
                </div>
              </div>

              {formData.codeSent && (
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Verification Code</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      maxLength={6}
                      value={verificationCodeInput}
                      onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      disabled={loading || formData.emailVerified}
                      style={{ textAlign: 'center', letterSpacing: 8, paddingRight: 100 }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={loading || verificationCodeInput.length !== 6 || formData.emailVerified}
                      style={{
                        position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                        background: formData.emailVerified ? 'var(--green)' : 'var(--accent)',
                        color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        opacity: (loading || verificationCodeInput.length !== 6 || formData.emailVerified) ? 0.5 : 1,
                      }}
                    >
                      {formData.emailVerified ? 'Verified ✓' : 'Verify'}
                    </button>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Enter the 6-digit code sent to your email</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {!formData.emailVerified && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, skipEmailVerification: true, emailVerified: false }));
                      setCurrentStep(2);
                    }}
                    className="btn-apple btn-apple-secondary"
                    disabled={loading || !formData.email}
                    style={{ flex: 1, height: 44 }}
                  >
                    Skip for now
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading || (!formData.emailVerified && !formData.skipEmailVerification && formData.codeSent)}
                  className="btn-apple btn-apple-primary"
                  style={{ flex: 1, height: 44 }}
                >
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Personal Information */}
          {currentStep === 2 && (
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Personal Information</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Tell us about yourself</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">First Name *</label>
                  <input type="text" className="form-input" required value={formData.firstName} onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))} placeholder="John" disabled={loading} />
                </div>
                <div>
                  <label className="form-label">Last Name *</label>
                  <input type="text" className="form-input" required value={formData.lastName} onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))} placeholder="Doe" disabled={loading} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Phone Number *</label>
                <input type="tel" className="form-input" required value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+1 234 567 8900" disabled={loading} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleBack} className="btn-apple btn-apple-secondary" disabled={loading} style={{ height: 44 }}>← Back</button>
                <button type="button" onClick={handleNext} className="btn-apple btn-apple-primary" disabled={loading} style={{ flex: 1, height: 44 }}>Next Step →</button>
              </div>
            </div>
          )}

          {/* Step 3: Company Information (B2B only) */}
          {currentStep === 3 && formData.accountType === 'b2b' && (
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Company Information</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Tell us about your company</p>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Company Name *</label>
                <input type="text" className="form-input" required value={formData.companyName} onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))} placeholder="Acme Corporation" disabled={loading} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Tax ID / VAT Number</label>
                <input type="text" className="form-input" value={formData.taxId} onChange={(e) => setFormData(prev => ({ ...prev, taxId: e.target.value }))} placeholder="TAX123456" disabled={loading} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleBack} className="btn-apple btn-apple-secondary" disabled={loading} style={{ height: 44 }}>← Back</button>
                <button type="button" onClick={handleNext} className="btn-apple btn-apple-primary" disabled={loading} style={{ flex: 1, height: 44 }}>Next Step →</button>
              </div>
            </div>
          )}

          {/* Step 4: Billing Address */}
          {currentStep === 4 && (
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Billing Address</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Where should we send invoices?</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="form-label">Address Line 1 *</label>
                  <input type="text" className="form-input" required value={formData.billingAddress1} onChange={(e) => setFormData(prev => ({ ...prev, billingAddress1: e.target.value }))} placeholder="123 Main Street" disabled={loading} />
                </div>
                <div>
                  <label className="form-label">Address Line 2</label>
                  <input type="text" className="form-input" value={formData.billingAddress2} onChange={(e) => setFormData(prev => ({ ...prev, billingAddress2: e.target.value }))} placeholder="Suite 100" disabled={loading} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">City *</label>
                    <input type="text" className="form-input" required value={formData.billingCity} onChange={(e) => setFormData(prev => ({ ...prev, billingCity: e.target.value }))} placeholder="New York" disabled={loading} />
                  </div>
                  <div>
                    <label className="form-label">State / Province</label>
                    <input type="text" className="form-input" value={formData.billingState} onChange={(e) => setFormData(prev => ({ ...prev, billingState: e.target.value }))} placeholder="NY" disabled={loading} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Postal Code *</label>
                    <input type="text" className="form-input" required value={formData.billingPostalCode} onChange={(e) => setFormData(prev => ({ ...prev, billingPostalCode: e.target.value }))} placeholder="10001" disabled={loading} />
                  </div>
                  <div>
                    <label className="form-label">Country *</label>
                    <select className="form-input" required value={formData.billingCountry} onChange={(e) => setFormData(prev => ({ ...prev, billingCountry: e.target.value }))} disabled={loading}>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="TR">Turkey</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleBack} className="btn-apple btn-apple-secondary" disabled={loading} style={{ height: 44 }}>← Back</button>
                <button type="button" onClick={handleNext} className="btn-apple btn-apple-primary" disabled={loading} style={{ flex: 1, height: 44 }}>Next Step →</button>
              </div>
            </div>
          )}

          {/* Step 5: Shipping Address */}
          {currentStep === 5 && (
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Shipping Address</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Where should we ship your orders?</p>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    id="sameAsBilling"
                    checked={formData.shippingSameAsBilling}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, shippingSameAsBilling: e.target.checked }));
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          shippingAddress1: prev.billingAddress1,
                          shippingAddress2: prev.billingAddress2,
                          shippingCity: prev.billingCity,
                          shippingState: prev.billingState,
                          shippingPostalCode: prev.billingPostalCode,
                          shippingCountry: prev.billingCountry,
                        }));
                      }
                    }}
                    disabled={loading}
                    style={{ accentColor: 'var(--accent)', width: 18, height: 18 }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Same as billing address</span>
                </label>
              </div>

              {!formData.shippingSameAsBilling && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label className="form-label">Address Line 1 *</label>
                    <input type="text" className="form-input" required value={formData.shippingAddress1} onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress1: e.target.value }))} placeholder="123 Main Street" disabled={loading} />
                  </div>
                  <div>
                    <label className="form-label">Address Line 2</label>
                    <input type="text" className="form-input" value={formData.shippingAddress2} onChange={(e) => setFormData(prev => ({ ...prev, shippingAddress2: e.target.value }))} placeholder="Suite 100" disabled={loading} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label">City *</label>
                      <input type="text" className="form-input" required value={formData.shippingCity} onChange={(e) => setFormData(prev => ({ ...prev, shippingCity: e.target.value }))} placeholder="New York" disabled={loading} />
                    </div>
                    <div>
                      <label className="form-label">State / Province</label>
                      <input type="text" className="form-input" value={formData.shippingState} onChange={(e) => setFormData(prev => ({ ...prev, shippingState: e.target.value }))} placeholder="NY" disabled={loading} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label">Postal Code *</label>
                      <input type="text" className="form-input" required value={formData.shippingPostalCode} onChange={(e) => setFormData(prev => ({ ...prev, shippingPostalCode: e.target.value }))} placeholder="10001" disabled={loading} />
                    </div>
                    <div>
                      <label className="form-label">Country *</label>
                      <select className="form-input" required value={formData.shippingCountry} onChange={(e) => setFormData(prev => ({ ...prev, shippingCountry: e.target.value }))} disabled={loading}>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="GB">United Kingdom</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="TR">Turkey</option>
                        <option value="AU">Australia</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleBack} className="btn-apple btn-apple-secondary" disabled={loading} style={{ height: 44 }}>← Back</button>
                <button type="button" onClick={handleNext} className="btn-apple btn-apple-primary" disabled={loading} style={{ flex: 1, height: 44 }}>Next Step →</button>
              </div>
            </div>
          )}

          {/* Step 6: Password */}
          {currentStep === 6 && (
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Account Security</h4>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Create a secure password</p>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" required minLength={8} value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} placeholder="••••••••" disabled={loading} autoComplete="new-password" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Minimum 8 characters</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Confirm Password *</label>
                <input type="password" className="form-input" required value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))} placeholder="••••••••" disabled={loading} autoComplete="new-password" />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleBack} className="btn-apple btn-apple-secondary" disabled={loading} style={{ height: 44 }}>← Back</button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-apple btn-apple-primary"
                  disabled={loading}
                  style={{ flex: 1, height: 44, background: 'var(--green)' }}
                >
                  {loading ? (
                    <><span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }} />Creating Account...</>
                  ) : (
                    <>✓ Complete Registration</>
                  )}
                </button>
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: 24, marginBottom: 0, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

