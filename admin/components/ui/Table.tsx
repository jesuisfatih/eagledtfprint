'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  title: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey?: string | ((row: T) => string);
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyIcon?: string;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey = 'id',
  onRowClick,
  emptyMessage = 'No data found',
  emptyIcon = 'ti-database-off',
}: TableProps<T>) {
  const getKey = (row: T, idx: number) => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey] ?? idx);
  };

  if (data.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 48 }}>
        <div className="empty-state-icon">
          <i className={`ti ${emptyIcon}`} />
        </div>
        <h4 className="empty-state-title">{emptyMessage}</h4>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="apple-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={getKey(row, idx)}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : undefined }}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
