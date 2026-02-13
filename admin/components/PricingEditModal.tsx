'use client';

import { useState, useEffect } from 'react';
import type { PricingRuleFormData, PricingRuleWithCompany } from '@/types';

interface PricingEditModalProps {
  show: boolean;
  rule: PricingRuleWithCompany | null;
  onClose: () => void;
  onSave: (id: string, data: PricingRuleFormData) => void;
}

export default function PricingEditModal({ show, rule, onClose, onSave }: PricingEditModalProps) {
  const [formData, setFormData] = useState<Partial<PricingRuleFormData>>({});

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description,
        targetType: rule.targetType,
        scopeType: rule.scopeType,
        discountType: rule.discountType,
        discountPercentage: rule.discountPercentage,
        discountValue: rule.discountValue,
        priority: rule.priority,
        isActive: rule.isActive,
      });
    }
  }, [rule]);

  if (!show || !rule) return null;

  return (
    <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Pricing Rule</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Rule Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Discount Type</label>
                <select
                  className="form-select"
                  value={formData.discountType || 'percentage'}
                  onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">Discount Value</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.discountPercentage || formData.discountValue || 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (formData.discountType === 'percentage') {
                      setFormData({...formData, discountPercentage: val});
                    } else {
                      setFormData({...formData, discountValue: val});
                    }
                  }}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Priority</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.priority || 0}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                />
              </div>
              <div className="col-md-6">
                <div className="form-check mt-4">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  />
                  <label className="form-check-label">Active</label>
                </div>
              </div>
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
                onSave(rule.id, formData);
                onClose();
              }}
            >
              Update Rule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

