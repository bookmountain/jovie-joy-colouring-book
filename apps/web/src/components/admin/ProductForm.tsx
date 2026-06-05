"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/api";
import {
  adminListCollections,
  type AdminProductWriteBody,
} from "@/lib/adminApi";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminPanel } from "@/components/admin/ui/AdminPanel";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminConfirmDialog } from "@/components/admin/ui/AdminConfirmDialog";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminTextarea } from "@/components/admin/ui/AdminTextarea";
import { AdminLabel } from "@/components/admin/ui/AdminLabel";
import { AdminField } from "@/components/admin/ui/AdminField";
import { AdminSwitch } from "@/components/admin/ui/AdminSwitch";
import { AdminChip } from "@/components/admin/ui/AdminChip";
import {
  AdminFormatPicker,
  type ProductFormat,
} from "@/components/admin/product/AdminFormatPicker";
import { AdminGalleryUploader } from "@/components/admin/product/AdminGalleryUploader";
import { AdminSourceLinksEditor, type SourceLinkValue } from "@/components/admin/product/AdminSourceLinksEditor";
import { adminUploadGeneral, adminUploadProductImage, adminUploadProductPdf } from "@/lib/adminApi";

export type ProductFormProps = {
  initial?: Product;
  onSubmit: (body: AdminProductWriteBody) => Promise<void>;
  submitLabel: string;
  onDiscard?: () => void;
  onDelete?: () => Promise<void> | void;
};

type Status = "published" | "draft" | "scheduled" | "out_of_stock";

function deriveStatus(available: boolean, publishedAt: string | null): Status {
  if (!available) return "out_of_stock";
  if (!publishedAt) return "draft";
  const date = Date.parse(publishedAt);
  if (Number.isFinite(date) && date > Date.now()) return "scheduled";
  return "published";
}

function statusLabel(s: Status): string {
  switch (s) {
    case "published": return "Published";
    case "draft": return "Draft";
    case "scheduled": return "Scheduled";
    case "out_of_stock": return "Out of stock";
  }
}

function statusBadgeVariant(s: Status): "pub" | "draft" | "scheduled" | "oos" {
  switch (s) {
    case "published": return "pub";
    case "draft": return "draft";
    case "scheduled": return "scheduled";
    case "out_of_stock": return "oos";
  }
}

function dollarsToCents(input: string): number {
  const n = Number(input.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

/** Convert a free-form title into a URL-safe slug (lowercase, dashes, alphanumerics). */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")  // strip combining diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

export function ProductForm({ initial, onSubmit, submitLabel, onDiscard, onDelete }: ProductFormProps) {
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [description, setDescription] = useState(initial?.description.join("\n\n") ?? "");
  const [priceDollars, setPriceDollars] = useState(centsToDollars(initial?.priceCents ?? 0));
  const [compareDollars, setCompareDollars] = useState(centsToDollars(initial?.compareAtPriceCents ?? null));
  const [available, setAvailable] = useState(initial?.available ?? true);
  const [productFormat, setProductFormat] = useState<ProductFormat>((initial?.productType as ProductFormat) ?? "physical");
  const [tags, setTags] = useState(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [collectionSlugs, setCollectionSlugs] = useState<string[]>(initial?.collections ?? []);
  const [publishedAt, setPublishedAt] = useState(initial?.publishedAt?.slice(0, 10) ?? "");

  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [inspirationImages, setInspirationImages] = useState<string[]>(initial?.inspirationImages ?? []);
  const [reviewImages, setReviewImages] = useState<string[]>(initial?.reviewImages ?? []);
  const [sourceLinks, setSourceLinks] = useState<SourceLinkValue[]>(initial?.sourceLinks ?? []);
  const [pdfPath, setPdfPath] = useState<string | null>(initial?.pdfPath ?? null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const [allCollections, setAllCollections] = useState<{ slug: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    adminListCollections().then((cs) => setAllCollections(cs.map((c) => ({ slug: c.slug, title: c.title })))).catch(() => {});
  }, []);

  const uploadImage = initial
    ? (file: File) => adminUploadProductImage(initial.slug, file)
    : (file: File) => adminUploadGeneral(file, "products");

  const status = deriveStatus(available, publishedAt || null);

  function toggleCollection(s: string) {
    setCollectionSlugs((cs) => (cs.includes(s) ? cs.filter((x) => x !== s) : [...cs, s]));
  }
  function addTag(value: string) {
    const v = value.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  }
  function removeTag(v: string) { setTags(tags.filter((t) => t !== v)); }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const body: AdminProductWriteBody = {
        slug: initial ? undefined : slug,
        title,
        excerpt,
        description: description.split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
        priceCents: dollarsToCents(priceDollars),
        compareAtPriceCents: compareDollars ? dollarsToCents(compareDollars) : null,
        available,
        productType: productFormat,
        images,
        sourceLinks: sourceLinks.length > 0 ? sourceLinks : null,
        reviewImages: reviewImages.length > 0 ? reviewImages : null,
        inspirationImages: inspirationImages.length > 0 ? inspirationImages : null,
        tags,
        collectionSlugs,
        publishedAt: publishedAt || null,
      };
      // NB: do NOT send `options` — BE preserves/defaults
      await onSubmit(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        crumb={<>Catalog · Products</>}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {title || "New product"}
            <AdminBadge variant={statusBadgeVariant(status)}>{statusLabel(status)}</AdminBadge>
          </span>
        }
        actions={
          <>
            {onDiscard ? <AdminButton variant="ghost" onClick={onDiscard}>Discard</AdminButton> : null}
            <AdminButton variant="primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving…" : submitLabel}
            </AdminButton>
          </>
        }
      />

      {error ? <p style={{ color: "#a3392a", marginBottom: 12 }}>{error}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.8fr) minmax(0, 1fr)", gap: 14 }}>
        {/* LEFT COLUMN — Basics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AdminPanel sectionTag="Basics">
            <AdminField>
              <AdminLabel htmlFor="pf-title">Title</AdminLabel>
              <AdminInput
                id="pf-title"
                size="lg"
                value={title}
                onChange={(e) => {
                  const next = e.target.value;
                  setTitle(next);
                  if (!initial) setSlug(slugify(next));
                }}
                required
              />
              {!initial ? (
                <div style={{ fontSize: 11, color: "var(--admin-muted)", marginTop: 4 }}>
                  Permalink: <code style={{ fontFamily: "ui-monospace, monospace" }}>/products/{slug || "your-product-title"}</code>
                </div>
              ) : null}
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="pf-excerpt">Excerpt</AdminLabel>
              <AdminInput id="pf-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} required />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="pf-description">Description</AdminLabel>
              <AdminTextarea id="pf-description" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
            </AdminField>
          </AdminPanel>

          <AdminPanel sectionTag="Media — Product gallery" hint="Carousel customers see on the product page. Drag to reorder. The primary (★) is used everywhere there's a thumbnail.">
            <AdminGalleryUploader value={images} onChange={setImages} upload={uploadImage} emptyHint="No images yet — add at least one." />
          </AdminPanel>

          <AdminPanel sectionTag="Media — Inspiration gallery" hint="Styled lifestyle photography shown in the 'story' section of the PDP. Optional.">
            <AdminGalleryUploader value={inspirationImages} onChange={setInspirationImages} upload={uploadImage} emptyHint="Optional — adds a styled gallery on the product page." />
          </AdminPanel>

          <AdminPanel sectionTag="Media — Customer photos" hint="Social-proof shots from customers / press. Optional.">
            <AdminGalleryUploader value={reviewImages} onChange={setReviewImages} upload={uploadImage} emptyHint="Optional — appears in the 'Real cozy moments' section." />
          </AdminPanel>

          <AdminPanel sectionTag={`Source links — "Buy from publisher" buttons`} hint="External retailer / language-edition links rendered as image buttons on the PDP.">
            <AdminSourceLinksEditor value={sourceLinks} onChange={setSourceLinks} upload={uploadImage} />
          </AdminPanel>

          {productFormat === "digital" ? (
            <AdminPanel variant="dashed" sectionTag="Digital fulfillment" hint="The uploaded PDF is what the customer receives by email after Stripe payment succeeds.">
              {pdfPath ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 0" }}>
                  <div style={{ fontSize: 28 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>{pdfPath.split("/").pop()}</strong>
                    <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>{pdfPath}</div>
                  </div>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    disabled={pdfBusy || !initial}
                    onClick={() => document.getElementById("pf-pdf-input")?.click()}
                  >
                    {pdfBusy ? "Uploading…" : "Replace"}
                  </AdminButton>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 13 }}>No PDF uploaded yet</strong>
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    disabled={pdfBusy || !initial}
                    onClick={() => document.getElementById("pf-pdf-input")?.click()}
                  >
                    {pdfBusy ? "Uploading…" : "Upload PDF"}
                  </AdminButton>
                </div>
              )}
              {!initial ? <p className="panel-hint" style={{ marginTop: 8 }}>Save the product first, then upload its PDF here.</p> : null}
              <input
                id="pf-pdf-input"
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f || !initial) return;
                  setPdfBusy(true);
                  try {
                    const res = await adminUploadProductPdf(initial.slug, f);
                    setPdfPath((res as { pdfPath: string | null }).pdfPath ?? null);
                  } finally {
                    setPdfBusy(false);
                  }
                }}
              />
            </AdminPanel>
          ) : null}

          {initial && onDelete ? (
            <AdminPanel variant="danger" sectionTag="Danger zone">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: 13 }}>Delete this product</strong>
                  <div style={{ fontSize: 11, color: "var(--admin-muted)" }}>Removes it from every collection. Past orders keep the original title and price.</div>
                </div>
                <AdminButton
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Delete product
                </AdminButton>
              </div>
              <AdminConfirmDialog
                open={confirmDeleteOpen}
                title={`Delete "${title || initial.slug}" permanently?`}
                body="Removes it from every collection. Past orders keep the original title and price."
                confirmLabel="Delete product"
                destructive
                onConfirm={async () => {
                  await onDelete();
                  setConfirmDeleteOpen(false);
                }}
                onCancel={() => setConfirmDeleteOpen(false)}
              />
            </AdminPanel>
          ) : null}
        </div>

        {/* RIGHT COLUMN — Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AdminPanel sectionTag="Visibility">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Published</strong>
              <AdminSwitch
                checked={!!publishedAt}
                onChange={(next) => setPublishedAt(next ? (publishedAt || new Date().toISOString().slice(0, 10)) : "")}
                aria-label="Published"
              />
            </div>
            <AdminField>
              <AdminLabel htmlFor="pf-published">Publish date</AdminLabel>
              <AdminInput id="pf-published" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
            </AdminField>
          </AdminPanel>

          <AdminPanel sectionTag="Format" hint="Drives where this product appears and how it's fulfilled.">
            <AdminFormatPicker value={productFormat} onChange={setProductFormat} />
          </AdminPanel>

          <AdminPanel sectionTag="Pricing">
            <AdminField>
              <AdminLabel htmlFor="pf-price">Price</AdminLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--admin-muted)", fontWeight: 700 }}>$</span>
                <AdminInput id="pf-price" inputMode="decimal" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} required />
              </div>
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="pf-compare">Compare-at</AdminLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "var(--admin-muted)", fontWeight: 700 }}>$</span>
                <AdminInput id="pf-compare" inputMode="decimal" value={compareDollars} placeholder="—" onChange={(e) => setCompareDollars(e.target.value)} />
              </div>
            </AdminField>
          </AdminPanel>

          <AdminPanel sectionTag="Availability" hint="When off, the PDP shows a 'Notify me when back' form instead of the cart button.">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong style={{ fontSize: 13 }}>Available for purchase</strong>
              <AdminSwitch checked={available} onChange={setAvailable} aria-label="Available" />
            </div>
          </AdminPanel>

          <AdminPanel sectionTag="Organization">
            <AdminField>
              <AdminLabel>Collections</AdminLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {allCollections.map((c) => {
                  const on = collectionSlugs.includes(c.slug);
                  return (
                    <AdminChip
                      key={c.slug}
                      variant={on ? "default" : "add"}
                      onClick={() => toggleCollection(c.slug)}
                      onDismiss={on ? () => toggleCollection(c.slug) : undefined}
                    >
                      {on ? c.title : `+ ${c.title}`}
                    </AdminChip>
                  );
                })}
              </div>
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor="pf-tag">Tags</AdminLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {tags.map((t) => (
                  <AdminChip key={t} variant="tag" onDismiss={() => removeTag(t)}>{t}</AdminChip>
                ))}
              </div>
              <AdminInput
                id="pf-tag"
                placeholder="Add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                style={{ marginTop: 6 }}
              />
            </AdminField>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
