'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { publicFetch } from '@/lib/api-client';

interface InvitationData {
  email: string;
  companyName?: string;
  role?: string;
  invitedBy?: string;
}

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    taxId: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);

  useEffect(() => {
    // Load invitation data
    loadInvitationData();
  }, [params.token]);

  const loadInvitationData = async () => {
    try {
      // Validate token by trying to get user info
      const response = await publicFetch(`/api/v1/auth/validate-invitation?token=${params.token}`);
      
      if (response.ok) {
        const data = await response.json();
        setInvitationData(data);
        // Pre-fill email if available
        if (data.email) {
          setFormData(prev => ({ ...prev, email: data.email }));
        }
        // Pre-fill company name if available
        if (data.companyName) {
          setFormData(prev => ({ ...prev, companyName: data.companyName }));
        }
      } else {
        setError('Invalid or expired invitation token');
      }
    } catch (err) {
      console.warn('Could not load invitation data:', err);
      setError('Could not validate invitation. Please check the link.');
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long!');
      return;
    }

    // Password complexity: uppercase, lowercase, number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, and one number!');
      return;
    }

    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required!');
      return;
    }

    if (!formData.companyName) {
      setError('Company name is required!');
      return;
    }

    setLoading(true);
    try {
      const response = await publicFetch('/api/v1/auth/accept-invitation', {
        method: 'POST',
        body: JSON.stringify({
          token: params.token,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          companyInfo: {
            name: formData.companyName,
            taxId: formData.taxId,
            phone: formData.phone,
            billingAddress: {
              address1: formData.address1,
              address2: formData.address2,
              city: formData.city,
              state: formData.state,
              postalCode: formData.postalCode,
              country: formData.country,
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Store auth data
        localStorage.setItem('eagle_token', data.accessToken);
        localStorage.setItem('eagle_userId', data.user.id);
        localStorage.setItem('eagle_companyId', data.user.companyId);
        localStorage.setItem('eagle_userEmail', data.user.email);
        localStorage.setItem('eagle_userName', `${data.user.firstName} ${data.user.lastName}`);
        
        // Show success message
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)';
        modal.innerHTML = `
          <div style="background:#fff;border-radius:16px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden">
            <div style="padding:24px 24px 0;text-align:center">
              <div style="font-size:48px;margin-bottom:12px">✅</div>
              <h3 style="font-weight:700;margin-bottom:8px">Registration Successful!</h3>
              <p style="color:#666;margin-bottom:8px">Your account has been created successfully and synced to Shopify!</p>
              <p style="color:#666;margin-bottom:0">Redirecting to dashboard...</p>
            </div>
            <div style="padding:20px 24px 24px;text-align:center">
              <button onclick="this.closest('div[style]').parentElement.remove(); window.location.href='/dashboard';" style="background:#34C759;color:#fff;border:none;border-radius:10px;padding:10px 32px;font-size:15px;font-weight:600;cursor:pointer">Go to Dashboard</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        {/* Left Panel - Welcome */}
        <div style={{
          display: 'none', flex: '0 0 55%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          alignItems: 'center', justifyContent: 'center', padding: 40,
        }} className="login-left-panel">
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🦅</div>
            <h2 style={{ fontWeight: 700, marginBottom: 12 }}>Welcome to Eagle B2B</h2>
            <p style={{ fontSize: 18, opacity: 0.85 }}>Complete your registration to start ordering</p>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <span style={{ fontSize: 32 }}>🦅</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Eagle B2B</span>
            </div>
            <h4 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Complete Registration 👋</h4>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Fill in your details to activate your account</p>

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
              <h6 style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>Personal Information</h6>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">First Name *</label>
                  <input type="text" className="form-input" required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="John" disabled={loading} />
                </div>
                <div>
                  <label className="form-label">Last Name *</label>
                  <input type="text" className="form-input" required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" disabled={loading} />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="john@company.com" disabled={true} readOnly style={{ opacity: 0.6 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Email from invitation (cannot be changed)</span>
                </div>
                <div>
                  <label className="form-label">Phone *</label>
                  <input type="tel" className="form-input" required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+1 234 567 8900" disabled={loading} />
                </div>
              </div>

              <h6 style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 12, marginTop: 20 }}>Company Information</h6>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Company Name *</label>
                  <input type="text" className="form-input" required value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} placeholder="Acme Corporation" disabled={loading} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Tax ID / VAT Number</label>
                    <input type="text" className="form-input" value={formData.taxId} onChange={(e) => setFormData({...formData, taxId: e.target.value})} placeholder="TAX123456" disabled={loading} />
                  </div>
                  <div>
                    <label className="form-label">Country *</label>
                    <select className="form-input" required value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} disabled={loading}>
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

              <h6 style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 12, marginTop: 20 }}>Billing Address</h6>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="form-label">Address Line 1 *</label>
                  <input type="text" className="form-input" required value={formData.address1} onChange={(e) => setFormData({...formData, address1: e.target.value})} placeholder="123 Main Street" disabled={loading} />
                </div>
                <div>
                  <label className="form-label">Address Line 2</label>
                  <input type="text" className="form-input" value={formData.address2} onChange={(e) => setFormData({...formData, address2: e.target.value})} placeholder="Suite 100" disabled={loading} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">City *</label>
                    <input type="text" className="form-input" required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="New York" disabled={loading} />
                  </div>
                  <div>
                    <label className="form-label">State / Province</label>
                    <input type="text" className="form-input" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} placeholder="NY" disabled={loading} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Postal Code *</label>
                  <input type="text" className="form-input" required value={formData.postalCode} onChange={(e) => setFormData({...formData, postalCode: e.target.value})} placeholder="10001" disabled={loading} style={{ maxWidth: '50%' }} />
                </div>
              </div>

              <h6 style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 12, marginTop: 20 }}>Account Security</h6>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div>
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-input" required minLength={8} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••••" disabled={loading} autoComplete="new-password" />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>Minimum 8 characters</span>
                </div>
                <div>
                  <label className="form-label">Confirm Password *</label>
                  <input type="password" className="form-input" required value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="••••••••" disabled={loading} autoComplete="new-password" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-apple btn-apple-primary"
                style={{ width: '100%', height: 44, marginBottom: 12 }}
              >
                {loading ? (
                  <><span className="spinner-apple" style={{ width: 16, height: 16, marginRight: 8 }} />Creating Account...</>
                ) : (
                  <>✓ Complete Registration</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

