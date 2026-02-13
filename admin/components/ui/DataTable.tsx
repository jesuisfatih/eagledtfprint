'use client';

import { ReactNode, useMemo, useState } from 'react';

/* Column definition compatible with old API */
export interface DataTableColumn<T> {
  key: string;
  label: string;
  title?: string;
  sortable?: boolean;
  className?: string;
  width?: string;
  render?: (row: T) => ReactNode;
}

interface StatusFilterOption {
  value: string;
  label: string;
  color?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: string[];
  statusFilter?: {
    field: string;
    options: StatusFilterOption[];
  };
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  pageSize?: number;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading,
  searchable,
  searchPlaceholder = 'Search...',
  searchFields = [],
  statusFilter,
  defaultSortKey,
  defaultSortOrder = 'asc',
  rowActions,
  onRowClick,
  emptyIcon = 'database-off',
  emptyTitle = 'No data found',
  emptyMessage = 'Try adjusting your search or filter criteria.',
  pageSize = 20,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [page, setPage] = useState(1);

  // Filter
  const filtered = useMemo(() => {
    let result = [...data];

    // Search
    if (search && searchFields.length > 0) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
        searchFields.some((field) => {
          const val = getNestedValue(row, field);
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Status filter
    if (statusFilter && statusValue) {
      result = result.filter((row) => {
        const val = getNestedValue(row, statusFilter.field);
        return String(val) === statusValue;
      });
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = getNestedValue(a, sortKey);
        const bVal = getNestedValue(b, sortKey);
        const aStr = aVal != null ? String(aVal) : '';
        const bStr = bVal != null ? String(bVal) : '';
        const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, searchFields, statusFilter, statusValue, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div>
      {/* Search & Filters */}
      {(searchable || statusFilter) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {searchable && (
            <div className="input-apple" style={{ minWidth: 240, flex: 1, maxWidth: 360 }}>
              <i className="ti ti-search input-icon" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          )}
          {statusFilter && (
            <select
              className="select-apple"
              value={statusValue}
              onChange={(e) => { setStatusValue(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              {statusFilter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-tertiary)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="apple-card" style={{ position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 10, borderRadius: 'inherit',
          }}>
            <i className="ti ti-loader-2 spin" style={{ fontSize: 24, color: 'var(--accent-primary)' }} />
          </div>
        )}

        {paged.length === 0 && !loading ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="empty-state-icon">
              <i className={`ti ti-${emptyIcon}`} />
            </div>
            <h4 className="empty-state-title">{emptyTitle}</h4>
            <p className="empty-state-desc">{emptyMessage}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="apple-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width, cursor: col.sortable ? 'pointer' : undefined }}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {col.label || col.title}
                        {col.sortable && sortKey === col.key && (
                          <i className={`ti ti-chevron-${sortOrder === 'asc' ? 'up' : 'down'}`} style={{ fontSize: 14 }} />
                        )}
                      </span>
                    </th>
                  ))}
                  {rowActions && <th style={{ width: 120 }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paged.map((row, idx) => (
                  <tr
                    key={String(row.id ?? idx)}
                    onClick={() => onRowClick?.(row)}
                    style={{ cursor: onRowClick ? 'pointer' : undefined }}
                  >
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                    {rowActions && (
                      <td onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="apple-pagination" style={{ marginTop: 16 }}>
          <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <i className="ti ti-chevron-left" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) { p = i + 1; }
            else if (page <= 4) { p = i + 1; }
            else if (page >= totalPages - 3) { p = totalPages - 6 + i; }
            else { p = page - 3 + i; }
            return (
              <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>
                {p}
              </button>
            );
          })}
          <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}
