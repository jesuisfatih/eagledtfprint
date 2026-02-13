'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/api-client';

export default function TopCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    loadTopCompanies();
  }, []);

  const loadTopCompanies = async () => {
    try {
      const response = await adminFetch('/api/v1/analytics/top-companies?limit=5');
      const data = await response.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      setCompanies([]);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">Top Companies</h5>
      </div>
      <div className="card-body">
        {companies.length === 0 ? (
          <p className="text-muted mb-0">No data yet</p>
        ) : (
          companies.map((company, i) => (
            <div key={i} className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-0">{company.name}</h6>
                <small className="text-muted">{company.orderCount} orders</small>
              </div>
              <span className="badge bg-label-primary">${company.totalSpent.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

