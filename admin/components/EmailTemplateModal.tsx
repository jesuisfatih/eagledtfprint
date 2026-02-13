'use client';

import { useState, useEffect } from 'react';
import type { EmailTemplate } from '@/types';

interface EmailTemplateData {
  type: string;
  subject: string;
  body: string;
}

interface EmailTemplateModalProps {
  show: boolean;
  template: EmailTemplateData | null;
  onClose: () => void;
  onSave: (template: EmailTemplateData) => void;
}

export default function EmailTemplateModal({ show, template, onClose, onSave }: EmailTemplateModalProps) {
  const [formData, setFormData] = useState({ subject: '', body: '' });

  useEffect(() => {
    if (template) {
      setFormData({ subject: template.subject, body: template.body });
    }
  }, [template]);

  if (!show || !template) return null;

  return (
    <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Email Template</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Subject</label>
              <input
                type="text"
                className="form-control"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email Body</label>
              <textarea
                className="form-control"
                rows={10}
                value={formData.body}
                onChange={(e) => setFormData({...formData, body: e.target.value})}
              />
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
                onSave({...template, ...formData});
                onClose();
              }}
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

