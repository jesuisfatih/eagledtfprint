'use client';

interface BulkActionsProps {
  selectedIds: string[];
  onAction: (action: string) => void;
}

export default function BulkActions({ selectedIds, onAction }: BulkActionsProps) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="alert alert-info d-flex justify-content-between align-items-center">
      <span>
        <i className="ti ti-check me-2"></i>
        {selectedIds.length} companies selected
      </span>
      <div className="d-flex gap-2">
        <button
          onClick={() => onAction('approve')}
          className="btn btn-sm btn-success"
        >
          Approve All
        </button>
        <button
          onClick={() => onAction('suspend')}
          className="btn btn-sm btn-warning"
        >
          Suspend All
        </button>
        <button
          onClick={() => onAction('delete')}
          className="btn btn-sm btn-danger"
        >
          Delete All
        </button>
      </div>
    </div>
  );
}

