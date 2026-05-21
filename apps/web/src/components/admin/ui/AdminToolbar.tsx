import type { ReactNode } from "react";

export type AdminToolbarProps = {
  searchValue: string;
  onSearchChange: (next: string) => void;
  placeholder?: string;
  searchAriaLabel?: string;
  children?: ReactNode;
};

export function AdminToolbar({ searchValue, onSearchChange, placeholder = "Search…", searchAriaLabel, children }: AdminToolbarProps) {
  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-search">
        <span aria-hidden style={{ color: "var(--admin-muted)" }}>🔍</span>
        <input
          aria-label={searchAriaLabel ?? placeholder}
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {children}
    </div>
  );
}
