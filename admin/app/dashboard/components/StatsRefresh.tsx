'use client';

export default function StatsRefresh({ onRefresh }: { onRefresh: () => void }) {
  return (
    <button
      onClick={onRefresh}
      className="btn btn-sm btn-icon btn-label-primary"
      title="Refresh Stats"
    >
      <i className="ti ti-refresh"></i>
    </button>
  );
}

