'use client';

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, string>;
  className?: string;
}

const DEFAULT_MAP: Record<string, { label: string; variant: string }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  processing: { label: 'Processing', variant: 'info' },
  shipped: { label: 'Shipped', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  paid: { label: 'Paid', variant: 'success' },
  unpaid: { label: 'Unpaid', variant: 'warning' },
  refunded: { label: 'Refunded', variant: 'danger' },
  draft: { label: 'Draft', variant: 'secondary' },
  open: { label: 'Open', variant: 'info' },
  closed: { label: 'Closed', variant: 'secondary' },
  ACTIVE: { label: 'Active', variant: 'success' },
  INACTIVE: { label: 'Inactive', variant: 'secondary' },
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
};

export default function StatusBadge({ status, colorMap, className = '' }: StatusBadgeProps) {
  let variant = 'secondary';
  let label = status;

  if (colorMap && colorMap[status]) {
    variant = colorMap[status];
  } else if (DEFAULT_MAP[status]) {
    variant = DEFAULT_MAP[status].variant;
    label = DEFAULT_MAP[status].label;
  }

  return (
    <span className={`badge-apple ${variant} ${className}`}>
      {label}
    </span>
  );
}
