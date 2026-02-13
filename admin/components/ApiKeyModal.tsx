'use client';

import { useState } from 'react';

interface ApiKeyModalProps {
  show: boolean;
  onClose: () => void;
  onGenerate: (keyName: string) => void;
}

export default function ApiKeyModal({ show, onClose, onGenerate }: ApiKeyModalProps) {
  const [keyName, setKeyName] = useState('');

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Generate API Key</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Key Name</label>
              <input
                type="text"
                className="form-control"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Production Key"
              />
            </div>
            <div className="alert alert-warning">
              <i className="ti ti-alert-triangle me-2"></i>
              <small>Keep your API key secure. It will only be shown once.</small>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-label-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (keyName) {
                  onGenerate(keyName);
                  setKeyName('');
                }
              }}
              disabled={!keyName}
            >
              Generate Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

