'use client';

export default function QuickActions() {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="card-title mb-0">Quick Actions</h5>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-3">
            <a href="/companies/invite" className="btn btn-primary w-100">
              <i className="ti ti-user-plus mb-2 d-block ti-lg"></i>
              Invite Company
            </a>
          </div>
          <div className="col-md-3">
            <a href="/pricing" className="btn btn-success w-100">
              <i className="ti ti-discount mb-2 d-block ti-lg"></i>
              Create Pricing Rule
            </a>
          </div>
          <div className="col-md-3">
            <a href="/settings" className="btn btn-info w-100">
              <i className="ti ti-refresh mb-2 d-block ti-lg"></i>
              Sync Data
            </a>
          </div>
          <div className="col-md-3">
            <a href="/analytics" className="btn btn-warning w-100">
              <i className="ti ti-chart-line mb-2 d-block ti-lg"></i>
              View Analytics
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

