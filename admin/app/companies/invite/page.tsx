'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/api-client';

export default function InviteCompanyPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create company
      const companyResp = await adminFetch('/api/v1/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: companyName,
          email: email,
          status: 'pending',
        }),
      });

      const company = await companyResp.json();

      // Invite user
      await adminFetch(`/api/v1/companies/${company.id}/users`, {
        method: 'POST',
        body: JSON.stringify({
          email: email,
          role: 'admin',
        }),
      });

      const modal = document.createElement('div');
      modal.className = 'modal fade show d-block';
      modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">✅ Success</h5>
              <button type="button" class="btn-close" onclick="location.href='/companies'"></button>
            </div>
            <div class="modal-body">Company invitation sent successfully!</div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" onclick="location.href='/companies'">OK</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } catch (err) {
      const modal = document.createElement('div');
      modal.className = 'modal fade show d-block';
      modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">❌ Error</h5>
              <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
            </div>
            <div class="modal-body">Failed to send invitation: ${err instanceof Error ? err.message : 'Unknown error'}</div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" onclick="this.closest('.modal').remove()">OK</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h4 className="fw-bold mb-4">Invite New Company</h4>

      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleInvite}>
                <div className="mb-3">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Corporation"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Contact Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@company.com"
                  />
                  <small className="text-muted">
                    An invitation email will be sent to this address
                  </small>
                </div>

                <div className="alert alert-info">
                  <i className="ti ti-info-circle me-2"></i>
                  The recipient will receive an email with a registration link to complete their company profile.
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/companies')}
                    className="btn btn-label-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

