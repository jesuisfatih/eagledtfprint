'use client';

import { useState, useEffect } from 'react';
import type { CompanyFormData, Company } from '@/types';

interface CompanyEditModalProps {
  show: boolean;
  company: Company | null;
  onClose: () => void;
  onSave: (data: CompanyFormData) => void;
}

export default function CompanyEditModal({ show, company, onClose, onSave }: CompanyEditModalProps) {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    companyGroup: '',
    address: '',
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        taxId: company.taxId || '',
        companyGroup: company.companyGroup || '',
        address: '',
      });
    }
  }, [company]);

  if (!show) return null;

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Company</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Tax ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.taxId}
                  onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                />
              </div>
              <div className="col-md-12">
                <label className="form-label">Company Group</label>
                <select
                  className="form-select"
                  value={formData.companyGroup}
                  onChange={(e) => setFormData({...formData, companyGroup: e.target.value})}
                >
                  <option value="">None</option>
                  <option value="VIP">VIP</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-label-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

