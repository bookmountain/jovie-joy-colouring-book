"use client";

export function AdminTopbar() {
  return (
    <div className="admin-topbar">
      <div className="qs">
        <span aria-hidden style={{ color: "var(--admin-muted)" }}>🔍</span>
        <input aria-label="Quick search (coming soon)" placeholder="Jump to product, order, customer… (coming soon)" disabled />
      </div>
      <div className="actions">
        <a className="view-site" href="/" target="_blank" rel="noreferrer">View storefront ↗</a>
      </div>
    </div>
  );
}
