'use client';

import { useState, useEffect } from 'react';
import type { RolePermission } from '@/types';

interface RoleEditModalProps {
  show: boolean;
  role: RolePermission | null;
  onClose: () => void;
  onSave: (role: RolePermission, permissions: string[]) => void;
}

export default function RoleEditModal({ show, role, onClose, onSave }: RoleEditModalProps) {
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (role) {
      setPermissions(role.permissions || []);
    }
  }, [role]);

  if (!show || !role) return null;

  const availablePermissions = ['all', 'orders', 'approve', 'team', 'cart', 'view', 'edit', 'delete'];

  return (
    <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div class Name="modal-header">
            <h5 className="modal-title">Edit {role.name} Permissions</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted mb-3">Select permissions for this role:</p>
            <div className="d-flex flex-wrap gap-2">
              {availablePermissions.map((perm) => (
                <div key={perm} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={permissions.includes(perm)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPermissions([...permissions, perm]);
                      } else {
                        setPermissions(permissions.filter(p => p !== perm));
                      }
                    }}
                    id={`perm-${perm}`}
                  />
                  <label className="form-check-label" htmlFor={`perm-${perm}`}>
                    {perm}
                  </label>
                </div>
              ))}
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
                onSave(role, permissions);
                onClose();
              }}
            >
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

