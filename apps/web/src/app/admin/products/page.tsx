"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminBulkProducts,
  adminListCollections,
  adminListProducts,
  adminListProductTags,
  type AdminProductListItem,
} from "@/lib/adminApi";
import { AdminAssetImage } from "@/components/admin/AdminAssetImage";
import { formatCents } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminToolbar } from "@/components/admin/ui/AdminToolbar";
import { AdminFilterChip } from "@/components/admin/ui/AdminFilterChip";
import { AdminBulkBar } from "@/components/admin/ui/AdminBulkBar";
import { AdminTable, type AdminTableColumn } from "@/components/admin/ui/AdminTable";
import { AdminPagination } from "@/components/admin/ui/AdminPagination";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminCheckbox } from "@/components/admin/ui/AdminCheckbox";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { PRODUCT_FORMATS } from "@/components/admin/product/AdminFormatPicker";
import { ProductCsvImportDialog } from "@/components/admin/product/ProductCsvImportDialog";
import { AdminConfirmDialog } from "@/components/admin/ui/AdminConfirmDialog";
import { notifySaved, notifyDeleted, notifyError } from "@/lib/toast";

const STATUSES = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "out_of_stock", label: "Out of stock" },
];

function relTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const d = Math.floor(ms / 86400000);
  if (d < 1) return "today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [formats, setFormats] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [collections, setCollections] = useState<string[]>([]);
  const [allCollections, setAllCollections] = useState<{ slug: string; title: string }[]>([]);
  const [sort, setSort] = useState<"updated_desc" | "title_asc" | "title_desc" | "price_asc" | "price_desc">("updated_desc");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkWarning, setBulkWarning] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => { adminListCollections().then((cs) => setAllCollections(cs.map((c) => ({ slug: c.slug, title: c.title })))).catch(() => {}); }, []);
  useEffect(() => { void adminListProductTags().catch(() => {}); }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q), 250);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    // A changed result scope must not retain hidden bulk selections from the
    // previous query/page; every destructive or repair action stays reviewable.
    setSelected(new Set());
    setBulkWarning(null);
    setLoading(true);
    setError(null);
    adminListProducts({ q: debouncedQ || undefined, format: formats, status: statuses, collection: collections, sort, page, pageSize })
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [debouncedQ, formats, statuses, collections, sort, page]);

  function toggleFilter(setFn: (next: string[]) => void, current: string[], v: string) {
    setPage(1);
    setFn(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
  }

  function toggleSelect(slug: string) {
    setBulkWarning(null);
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.slug));
  function toggleSelectAll() {
    setBulkWarning(null);
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.slug)));
  }

  async function bulk(action: Parameters<typeof adminBulkProducts>[0]["action"], payload?: { collectionSlug?: string }) {
    if (selected.size === 0) return;
    const requestedSlugs = Array.from(selected);
    try {
      const result = await adminBulkProducts({ slugs: requestedSlugs, action, payload });
      setSelected(new Set(result.missing));
      setBulkWarning(result.missing.length > 0
        ? `${result.missing.length} selected product${result.missing.length === 1 ? " no longer exists" : "s no longer exist"} and ${result.missing.length === 1 ? "was" : "were"} not changed: ${result.missing.join(", ")}. Clear the retained selection after reviewing it.`
        : null);
      // refresh
      const res = await adminListProducts({ q: debouncedQ || undefined, format: formats, status: statuses, collection: collections, sort, page, pageSize });
      setItems(res.items); setTotal(res.total);
      if (result.updated > 0) {
        if (action === "delete") notifyDeleted(`${result.updated} product${result.updated === 1 ? "" : "s"}`);
        else notifySaved(`${result.updated} product${result.updated === 1 ? "" : "s"}`);
      }
    } catch (e) {
      setBulkWarning(e instanceof Error ? e.message : "The bulk action failed. No selections were cleared.");
      notifyError(e);
    }
  }

  async function refreshAfterImport(count: number) {
    try {
      const res = await adminListProducts({ q: debouncedQ || undefined, format: formats, status: statuses, collection: collections, sort, page, pageSize });
      setItems(res.items);
      setTotal(res.total);
      notifySaved(`${count} product${count === 1 ? "" : "s"} imported`);
    } catch (reason) {
      notifyError(reason);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const counts = useMemo(() => {
    const by = (s: string) => items.filter((i) => i.status === s).length;
    return { pub: by("published"), draft: by("draft"), oos: by("out_of_stock") };
  }, [items]);

  const columns: AdminTableColumn<AdminProductListItem>[] = [
    {
      key: "_select",
      width: "34px",
      label: <AdminCheckbox aria-label="select all rows" checked={allSelected} onChange={toggleSelectAll} />,
      render: (row) => (
        <AdminCheckbox
          aria-label={`select ${row.slug}`}
          checked={selected.has(row.slug)}
          onChange={() => toggleSelect(row.slug)}
        />
      ),
    },
    {
      key: "_thumb",
      width: "56px",
      label: "",
      render: (row) => (
        <div style={{ width: 36, height: 36, background: "#fef0d4", border: "1px solid var(--admin-line-soft)", borderRadius: 8, overflow: "hidden" }}>
          <AdminAssetImage
            alt={`${row.title} thumbnail`}
            src={row.primaryImage}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ),
    },
    {
      key: "title",
      label: "Product",
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 800 }}>{row.title}</div>
          <div style={{ fontSize: 10, color: "var(--admin-muted)", fontFamily: "ui-monospace, monospace" }}>/{row.slug}</div>
        </div>
      ),
    },
    {
      key: "format",
      label: "Format",
      render: (row) => {
        const fmt = PRODUCT_FORMATS.find((f) => f.value === row.productType);
        return <span>{fmt ? `${fmt.icon} ${fmt.label}` : row.productType}</span>;
      },
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (row) => (
        <span>
          {formatCents(row.priceCents)}
          {row.compareAtPriceCents ? <span style={{ color: "var(--admin-muted)", textDecoration: "line-through", fontSize: 10, marginLeft: 5 }}>{formatCents(row.compareAtPriceCents)}</span> : null}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const variant = row.status === "published" ? "pub" : row.status === "draft" ? "draft" : row.status === "scheduled" ? "scheduled" : "oos";
        const label = row.status === "out_of_stock" ? "Out of stock" : row.status.charAt(0).toUpperCase() + row.status.slice(1);
        return <AdminBadge variant={variant}>{label}</AdminBadge>;
      },
    },
    {
      key: "collections",
      label: "Collections",
      render: (row) => row.collectionSlugs.slice(0, 3).map((s) => (
        <span key={s} style={{ background: "var(--admin-coral-soft)", color: "#a3392a", padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, marginRight: 3 }}>{s}</span>
      )),
    },
    { key: "updated", label: "Updated", sortable: true, render: (row) => <span>{relTime(row.updatedAt)}</span> },
  ];

  return (
    <div>
      <AdminPageHeader
        crumb="Catalog"
        title="Products"
        subtitle={`${total} products · ${counts.pub} published · ${counts.draft} drafts · ${counts.oos} out of stock (on this page)`}
        actions={
          <>
            <AdminButton onClick={() => setImportOpen(true)} variant="ghost">Import CSV</AdminButton>
            <Link href="/admin/products/new"><AdminButton variant="primary">+ New product</AdminButton></Link>
          </>
        }
      />

      <AdminToolbar searchValue={q} onSearchChange={(v) => { setPage(1); setQ(v); }} placeholder="Search by title, slug, tag…">
        {PRODUCT_FORMATS.map((f) => (
          <AdminFilterChip key={f.value} active={formats.includes(f.value)} onClick={() => toggleFilter(setFormats, formats, f.value)}>{f.icon} {f.label}</AdminFilterChip>
        ))}
        <span style={{ width: 1, height: 22, background: "var(--admin-line)" }} />
        {STATUSES.map((s) => (
          <AdminFilterChip key={s.value} active={statuses.includes(s.value)} onClick={() => toggleFilter(setStatuses, statuses, s.value)}>{s.label}</AdminFilterChip>
        ))}
        <span style={{ width: 1, height: 22, background: "var(--admin-line)" }} />
        <select
          aria-label="sort"
          value={sort}
          onChange={(e) => { setPage(1); setSort(e.target.value as typeof sort); }}
          className="admin-select"
          style={{ maxWidth: 180 }}
        >
          <option value="updated_desc">Sort: Updated ↓</option>
          <option value="updated_asc">Updated ↑</option>
          <option value="title_asc">Title A→Z</option>
          <option value="title_desc">Title Z→A</option>
          <option value="price_asc">Price low→high</option>
          <option value="price_desc">Price high→low</option>
        </select>
      </AdminToolbar>

      <AdminBulkBar selectedCount={selected.size} onClear={() => { setSelected(new Set()); setBulkWarning(null); }}>
        {allCollections.length > 0 ? (
          <select
            aria-label="add to collection"
            defaultValue=""
            onChange={(e) => { if (e.target.value) { void bulk("add-to-collection", { collectionSlug: e.target.value }); e.target.value = ""; } }}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "6px 12px", fontFamily: "inherit" }}
          >
            <option value="" disabled>Add to collection…</option>
            {allCollections.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </select>
        ) : null}
        <button onClick={() => void bulk("publish")}>Publish</button>
        <button onClick={() => void bulk("unpublish")}>Unpublish</button>
        <button onClick={() => void bulk("mark-available")}>In stock</button>
        <button onClick={() => void bulk("mark-unavailable")}>Out of stock</button>
        <button data-tone="danger" onClick={() => setBulkDeleteOpen(true)}>Delete</button>
      </AdminBulkBar>

      {bulkWarning ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {bulkWarning}
        </p>
      ) : null}

      <AdminConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selected.size} product${selected.size === 1 ? "" : "s"}?`}
        body="The selected products will be permanently deleted. This cannot be undone."
        confirmLabel="Delete products"
        destructive
        onConfirm={async () => {
          await bulk("delete");
          setBulkDeleteOpen(false);
        }}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      {!loading && items.length === 0 && total === 0 ? (
        <AdminEmptyState icon="📦" heading="No products yet" body="Add your first product to start cataloguing." action={<Link href="/admin/products/new"><AdminButton variant="primary">+ Add product</AdminButton></Link>} />
      ) : !loading && items.length === 0 ? (
        <AdminEmptyState icon="🔎" heading="No products match these filters" body="Try clearing some filters." action={<AdminButton variant="ghost" onClick={() => { setQ(""); setFormats([]); setStatuses([]); setCollections([]); setPage(1); }}>Clear filters</AdminButton>} />
      ) : (
        <>
          <AdminTable
            columns={columns}
            rows={items}
            getRowKey={(r) => r.slug}
            onRowClick={(r) => router.push(`/admin/products/${r.slug}`)}
            isSelected={(r) => selected.has(r.slug)}
            loading={loading}
          />
          <AdminPagination page={page} totalPages={totalPages} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}

      {error ? <p style={{ color: "#a3392a", marginTop: 12 }}>{error}</p> : null}

      <ProductCsvImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refreshAfterImport}
      />
    </div>
  );
}
