'use client';

import { useState } from 'react';

interface InviteModalProps {
  show: boolean;
  onClose: () => void;
  onInvite: (email: string) => void;
}

export default function InviteModal({ show, onClose, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState('');

  if (!show) return null;

  const handleSubmit = () => {
    if (!email) return;
    onInvite(email);
    setEmail('');
  };

  return (
    <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="ti ti-mail me-2"></i>
              Invite New Company
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted mb-3">
              Send an invitation to a new company. They can register even if they're not in Shopify yet.
            </p>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
                autoFocus
              />
              <small className="text-muted">
                An invitation email will be sent with registration link
              </small>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-label-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!email}
            >
              <i className="ti ti-send me-1"></i>
              Send Invitation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

