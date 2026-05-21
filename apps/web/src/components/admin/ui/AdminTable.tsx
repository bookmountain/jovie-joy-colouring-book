import type { ReactNode } from "react";

export type AdminTableColumn<Row> = {
  key: string;
  label: ReactNode;
  width?: string;
  sortable?: boolean;
  render?: (row: Row) => ReactNode;
};

export type AdminTableProps<Row> = {
  columns: AdminTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  isSelected?: (row: Row) => boolean;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  loading?: boolean;
};

export function AdminTable<Row extends Record<string, unknown>>({
  columns, rows, getRowKey, onRowClick, isSelected, sortKey, sortDir, onSort, loading,
}: AdminTableProps<Row>) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                data-sortable={c.sortable ? "true" : undefined}
                onClick={c.sortable && onSort ? () => onSort(c.key) : undefined}
              >
                {c.label}
                {c.sortable && sortKey === c.key ? <span aria-hidden> {sortDir === "asc" ? "↑" : "↓"}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={`s-${i}`} className="skeleton-row">
                  {columns.map((c) => <td key={c.key}><div className="skeleton-bar" /></td>)}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  data-selected={isSelected?.(row) ? "true" : undefined}
                  role={onRowClick ? "button" : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}</td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
