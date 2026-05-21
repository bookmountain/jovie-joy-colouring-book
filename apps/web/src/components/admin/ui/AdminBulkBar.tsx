import type { ReactNode } from "react";

export type AdminBulkBarProps = {
  selectedCount: number;
  onClear: () => void;
  children?: ReactNode;
};

export function AdminBulkBar({ selectedCount, onClear, children }: AdminBulkBarProps) {
  if (selectedCount === 0) return null;
  return (
    <div className="admin-bulk" role="status">
      <span aria-hidden>✓</span>
      <span className="count">{selectedCount} selected</span>
      <div className="actions">{children}</div>
      <button type="button" className="dismiss" aria-label="clear selection" onClick={onClear}>×</button>
    </div>
  );
}
