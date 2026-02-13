'use client';

interface InviteMemberModalProps {
  show: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => void;
}

export default function InviteMemberModal({ show, onClose, onInvite }: InviteMemberModalProps) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-header">
          <h5 className="modal-title">Invite Team Member</h5>
          <button
            type="button"
            className="btn-apple btn-apple-secondary"
            onClick={onClose}
            style={{ padding: '4px 8px', fontSize: 18, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              id="inviteEmail"
              placeholder="member@company.com"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Role</label>
            <select className="form-input" id="inviteRole">
              <option value="buyer">Buyer</option>
              <option value="manager">Manager</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="apple-alert apple-alert-info" style={{ fontSize: 13 }}>
            <i className="ti ti-info-circle" style={{ marginRight: 8 }}></i>
            Only administrators can invite members. Contact your admin if you need access.
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-apple btn-apple-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-apple btn-apple-primary"
            onClick={() => {
              const email = (document.getElementById('inviteEmail') as HTMLInputElement).value;
              const role = (document.getElementById('inviteRole') as HTMLSelectElement).value;
              if (email) {
                onInvite(email, role);
              }
            }}
          >
            Send Invitation
          </button>
        </div>
      </div>
    </div>
  );
}

