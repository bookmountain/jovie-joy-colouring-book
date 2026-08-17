"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminGetContent, adminUpsertContent,
  adminListFooterLinks, adminCreateFooterLink, adminUpdateFooterLink, adminDeleteFooterLink,
  adminListSocialLinks, adminCreateSocialLink, adminUpdateSocialLink, adminDeleteSocialLink,
  adminListTrendingTerms, adminCreateTrendingTerm, adminDeleteTrendingTerm,
  type AdminFooterLink, type AdminSocialLink, type AdminTrendingTerm,
} from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";
import { AdminButton, AdminConfirmDialog, AdminInput, AdminPanel, AdminPageHeader } from "@/components/admin/ui";
import { notifySaved, notifyDeleted, notifyError } from "@/lib/toast";

type PendingDelete =
  | { kind: "footer"; id: string; label: string }
  | { kind: "social"; label: string }
  | { kind: "term"; term: string };

// The storefront ties links into a column by an internal key. Admins only ever
// see and type the visible heading; the key is derived from it here.
function columnKeyFromHeading(heading: string, taken: string[]): string {
  const base = heading.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "column";
  if (!taken.includes(base)) return base;
  let suffix = 2;
  while (taken.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export default function AdminFooterPage() {
  const [contactDraft, setContactDraft] = useState<unknown>({});
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSavedAt, setContactSavedAt] = useState<string | null>(null);

  const [footer, setFooter] = useState<AdminFooterLink[]>([]);
  const [social, setSocial] = useState<AdminSocialLink[]>([]);
  const [trending, setTrending] = useState<AdminTrendingTerm[]>([]);

  const [newLink, setNewLink] = useState<Record<string, { label: string; href: string }>>({});
  const [newColumn, setNewColumn] = useState({ heading: "", label: "", href: "" });
  const [newSocial, setNewSocial] = useState({ label: "", href: "", sortIndex: 0 });
  const [newTerm, setNewTerm] = useState({ term: "", sortIndex: 0 });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    adminGetContent("footer.contact").then((b) => setContactDraft(b.data)).catch(() => setContactDraft({}));
    adminListFooterLinks().then(setFooter);
    adminListSocialLinks().then(setSocial);
    adminListTrendingTerms().then(setTrending);
  }, []);

  // One entry per footer column, heading taken from its first link — the same
  // rule the storefront uses.
  const columns = useMemo(() => {
    const byKey = new Map<string, { key: string; title: string; links: AdminFooterLink[] }>();
    for (const link of [...footer].sort((a, b) => a.sortIndex - b.sortIndex)) {
      const existing = byKey.get(link.groupKey);
      if (existing) existing.links.push(link);
      else byKey.set(link.groupKey, { key: link.groupKey, title: link.groupTitle, links: [link] });
    }
    return [...byKey.values()];
  }, [footer]);

  async function saveContact() {
    setContactSaving(true);
    try {
      await adminUpsertContent("footer.contact", { type: "FooterContact", data: contactDraft, sortIndex: 0 });
      setContactSavedAt(new Date().toLocaleTimeString());
      notifySaved("Contact");
    } catch (e) {
      notifyError(e);
    } finally {
      setContactSaving(false);
    }
  }

  async function addFooterLink(groupKey: string, groupTitle: string) {
    const draft = newLink[groupKey];
    if (!draft?.label.trim() || !draft.href.trim()) return;
    const nextSort = Math.max(-1, ...footer.filter((f) => f.groupKey === groupKey).map((f) => f.sortIndex)) + 1;
    try {
      const created = await adminCreateFooterLink({
        groupKey, groupTitle, label: draft.label, href: draft.href, sortIndex: nextSort,
      });
      setFooter((cur) => [...cur, created]);
      setNewLink((cur) => ({ ...cur, [groupKey]: { label: "", href: "" } }));
      notifySaved("Link");
    } catch (e) { notifyError(e); }
  }

  async function addColumn() {
    if (!newColumn.heading.trim() || !newColumn.label.trim() || !newColumn.href.trim()) return;
    const groupKey = columnKeyFromHeading(newColumn.heading, footer.map((f) => f.groupKey));
    try {
      const created = await adminCreateFooterLink({
        groupKey, groupTitle: newColumn.heading, label: newColumn.label, href: newColumn.href, sortIndex: 0,
      });
      setFooter((cur) => [...cur, created]);
      setNewColumn({ heading: "", label: "", href: "" });
      notifySaved("Column");
    } catch (e) { notifyError(e); }
  }

  // Renaming a column rewrites the heading on every link inside it, so the
  // group can never split in two on the storefront.
  async function renameColumn(groupKey: string, groupTitle: string) {
    const rows = footer.filter((f) => f.groupKey === groupKey && f.groupTitle !== groupTitle);
    if (rows.length === 0) return;
    try {
      const updated = await Promise.all(rows.map((row) => adminUpdateFooterLink(row.id, { ...row, groupTitle })));
      setFooter((cur) => cur.map((f) => updated.find((u) => u.id === f.id) ?? f));
      notifySaved("Column heading");
    } catch (e) { notifyError(e); }
  }
  async function updateFooterLink(id: string, patch: Partial<AdminFooterLink>) {
    const current = footer.find((f) => f.id === id);
    if (!current) return;
    try {
      const updated = await adminUpdateFooterLink(id, { ...current, ...patch });
      setFooter((cur) => cur.map((f) => (f.id === id ? updated : f)));
      notifySaved("Link");
    } catch (e) { notifyError(e); }
  }
  async function deleteFooterLink(id: string) {
    try {
      await adminDeleteFooterLink(id);
      setFooter((cur) => cur.filter((f) => f.id !== id));
      notifyDeleted("Link");
    } catch (e) { notifyError(e); } finally { setPendingDelete(null); }
  }

  async function addSocial() {
    try {
      const created = await adminCreateSocialLink(newSocial);
      setSocial((cur) => [...cur, created]);
      setNewSocial({ label: "", href: "", sortIndex: 0 });
      notifySaved("Social link");
    } catch (e) { notifyError(e); }
  }
  async function updateSocial(label: string, patch: { href: string; sortIndex: number }) {
    try {
      const updated = await adminUpdateSocialLink(label, patch);
      setSocial((cur) => cur.map((s) => (s.label === label ? updated : s)));
      notifySaved("Social link");
    } catch (e) { notifyError(e); }
  }
  async function deleteSocial(label: string) {
    try {
      await adminDeleteSocialLink(label);
      setSocial((cur) => cur.filter((s) => s.label !== label));
      notifyDeleted("Social link");
    } catch (e) { notifyError(e); } finally { setPendingDelete(null); }
  }

  async function addTerm() {
    try {
      const created = await adminCreateTrendingTerm(newTerm);
      setTrending((cur) => [...cur, created]);
      setNewTerm({ term: "", sortIndex: 0 });
      notifySaved("Term");
    } catch (e) { notifyError(e); }
  }
  async function deleteTerm(term: string) {
    try {
      await adminDeleteTrendingTerm(term);
      setTrending((cur) => cur.filter((t) => t.term !== term));
      notifyDeleted("Term");
    } catch (e) { notifyError(e); } finally { setPendingDelete(null); }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Footer" />

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Contact</h2>
        <ContentBlockEditor blockKey="footer.contact" type="FooterContact" data={contactDraft} onChange={setContactDraft} />
        <div className="flex items-center gap-3">
          <AdminButton className="disabled:opacity-60" disabled={contactSaving} onClick={saveContact} type="button" variant="primary">
            {contactSaving ? "Saving…" : "Save contact"}
          </AdminButton>
          {contactSavedAt ? <span className="text-xs text-cocoa-mint">Saved at {contactSavedAt}</span> : null}
        </div>
      </AdminPanel>

      <AdminPanel className="space-y-5">
        <div>
          <h2 className="text-lg font-bold">Footer columns</h2>
          <p className="mt-1 text-sm text-cocoa-text">
            Each column appears in the site footer under its heading. Renaming a heading
            updates every link in that column.
          </p>
        </div>

        {columns.map((column) => (
          <div className="rounded-coco-sm border border-cocoa-line bg-white p-4" key={column.key}>
            <label className="block text-xs font-semibold text-cocoa-text" htmlFor={`heading-${column.key}`}>
              Column heading
            </label>
            <AdminInput
              className="mt-1 w-64 font-semibold"
              defaultValue={column.title}
              id={`heading-${column.key}`}
              onBlur={(e) => renameColumn(column.key, e.target.value)}
            />
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-cocoa-line text-left text-cocoa-text">
                  <th className="py-2">Label</th><th>Link</th><th className="w-20">Order</th><th />
                </tr>
              </thead>
              <tbody>
                {column.links.map((f) => (
                  <tr key={f.id} className="border-b border-cocoa-line">
                    <td className="py-2"><AdminInput className="w-48" defaultValue={f.label} onBlur={(e) => updateFooterLink(f.id, { label: e.target.value })} /></td>
                    <td><AdminInput className="w-64" defaultValue={f.href} onBlur={(e) => updateFooterLink(f.id, { href: e.target.value })} /></td>
                    <td><AdminInput className="w-16" defaultValue={f.sortIndex} onBlur={(e) => updateFooterLink(f.id, { sortIndex: Number(e.target.value) })} type="number" /></td>
                    <td className="text-right"><button className="text-cocoa-coral underline" onClick={() => setPendingDelete({ kind: "footer", id: f.id, label: f.label })} type="button">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <AdminInput
                aria-label={`New link label for ${column.title}`}
                onChange={(e) => setNewLink((cur) => ({ ...cur, [column.key]: { label: e.target.value, href: cur[column.key]?.href ?? "" } }))}
                placeholder="Label"
                value={newLink[column.key]?.label ?? ""}
              />
              <AdminInput
                aria-label={`New link URL for ${column.title}`}
                onChange={(e) => setNewLink((cur) => ({ ...cur, [column.key]: { label: cur[column.key]?.label ?? "", href: e.target.value } }))}
                placeholder="/pages/about-us"
                value={newLink[column.key]?.href ?? ""}
              />
              <AdminButton onClick={() => addFooterLink(column.key, column.title)} type="button" variant="ghost">+ Add link</AdminButton>
            </div>
          </div>
        ))}

        <div className="rounded-coco-sm border border-dashed border-cocoa-line p-4">
          <h3 className="text-sm font-bold">New column</h3>
          <p className="mt-1 text-xs text-cocoa-text">Adds another heading to the footer, with its first link.</p>
          <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
            <AdminInput aria-label="New column heading" placeholder="Heading (e.g. Support)" value={newColumn.heading} onChange={(e) => setNewColumn({ ...newColumn, heading: e.target.value })} />
            <AdminInput aria-label="New column first link label" placeholder="First link label" value={newColumn.label} onChange={(e) => setNewColumn({ ...newColumn, label: e.target.value })} />
            <AdminInput aria-label="New column first link URL" placeholder="/pages/contact" value={newColumn.href} onChange={(e) => setNewColumn({ ...newColumn, href: e.target.value })} />
            <AdminButton onClick={addColumn} type="button" variant="ghost">+ Add column</AdminButton>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Social links</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-cocoa-line text-left text-cocoa-text"><th className="py-2">Label</th><th>Href</th><th>Order</th><th /></tr></thead>
          <tbody>
            {social.map((s) => (
              <tr key={s.label} className="border-b border-cocoa-line">
                <td className="py-2 font-semibold">{s.label}</td>
                <td><AdminInput className="w-64" defaultValue={s.href} onBlur={(e) => updateSocial(s.label, { href: e.target.value, sortIndex: s.sortIndex })} /></td>
                <td><AdminInput className="w-16" defaultValue={s.sortIndex} onBlur={(e) => updateSocial(s.label, { href: s.href, sortIndex: Number(e.target.value) })} type="number" /></td>
                <td className="text-right"><button className="text-cocoa-coral underline" onClick={() => setPendingDelete({ kind: "social", label: s.label })} type="button">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-4 gap-2">
          <AdminInput placeholder="Label (e.g. Instagram)" value={newSocial.label} onChange={(e) => setNewSocial({ ...newSocial, label: e.target.value })} />
          <AdminInput className="col-span-2" placeholder="https://…" value={newSocial.href} onChange={(e) => setNewSocial({ ...newSocial, href: e.target.value })} />
          <AdminButton onClick={addSocial} type="button" variant="ghost">+ Add</AdminButton>
        </div>
      </AdminPanel>

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Search trending terms</h2>
        <ul className="space-y-1 text-sm">
          {trending.map((t) => (
            <li key={t.term} className="flex items-center gap-2">
              <span className="flex-1">{t.term}</span>
              <button className="text-cocoa-coral underline" onClick={() => setPendingDelete({ kind: "term", term: t.term })} type="button">Delete</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <AdminInput className="flex-1" placeholder="New term" value={newTerm.term} onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })} />
          <AdminButton disabled={!newTerm.term} onClick={addTerm} type="button" variant="ghost">+ Add</AdminButton>
        </div>
      </AdminPanel>

      <AdminConfirmDialog
        open={!!pendingDelete}
        title={
          pendingDelete?.kind === "footer" ? `Delete footer link "${pendingDelete.label}"?`
          : pendingDelete?.kind === "social" ? `Delete social link "${pendingDelete.label}"?`
          : pendingDelete?.kind === "term" ? `Delete trending term "${pendingDelete.term}"?`
          : "Delete?"
        }
        body="This will be permanently removed."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === "footer") return deleteFooterLink(pendingDelete.id);
          if (pendingDelete.kind === "social") return deleteSocial(pendingDelete.label);
          return deleteTerm(pendingDelete.term);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
