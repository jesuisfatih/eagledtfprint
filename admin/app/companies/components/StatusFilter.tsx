'use client';

interface StatusFilterProps {
  onFilter: (status: string) => void;
}

export default function StatusFilter({ onFilter }: StatusFilterProps) {
  return (
    <select
      className="form-select"
      onChange={(e) => onFilter(e.target.value)}
      style={{ width: '150px' }}
    >
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="pending">Pending</option>
      <option value="suspended">Suspended</option>
    </select>
  );
}

