"use client";

import { useEffect, useState } from "react";
import {
  adminGetContent, adminUpsertContent,
  adminListFooterLinks, adminCreateFooterLink, adminUpdateFooterLink, adminDeleteFooterLink,
  adminListSocialLinks, adminCreateSocialLink, adminUpdateSocialLink, adminDeleteSocialLink,
  adminListTrendingTerms, adminCreateTrendingTerm, adminDeleteTrendingTerm,
  type AdminFooterLink, type AdminSocialLink, type AdminTrendingTerm,
} from "@/lib/adminApi";
import { ContentBlockEditor } from "@/components/admin/ContentBlockEditor";

export default function AdminFooterPage() {
  const [contactDraft, setContactDraft] = useState<unknown>({});
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSavedAt, setContactSavedAt] = useState<string | null>(null);

  const [footer, setFooter] = useState<AdminFooterLink[]>([]);
  const [social, setSocial] = useState<AdminSocialLink[]>([]);
  const [trending, setTrending] = useState<AdminTrendingTerm[]>([]);

  const [newLink, setNewLink] = useState({ groupKey: "", groupTitle: "", label: "", href: "", sortIndex: 0 });
  const [newSocial, setNewSocial] = useState({ label: "", href: "", sortIndex: 0 });
  const [newTerm, setNewTerm] = useState({ term: "", sortIndex: 0 });

  useEffect(() => {
    adminGetContent("footer.contact").then((b) => setContactDraft(b.data)).catch(() => setContactDraft({}));
    adminListFooterLinks().then(setFooter);
    adminListSocialLinks().then(setSocial);
    adminListTrendingTerms().then(setTrending);
  }, []);

  async function saveContact() {
    setContactSaving(true);
    try {
      await adminUpsertContent("footer.contact", { type: "FooterContact", data: contactDraft, sortIndex: 0 });
      setContactSavedAt(new Date().toLocaleTimeString());
    } finally {
      setContactSaving(false);
    }
  }

  async function addFooterLink() {
    const created = await adminCreateFooterLink(newLink);
    setFooter((cur) => [...cur, created]);
    setNewLink({ groupKey: "", groupTitle: "", label: "", href: "", sortIndex: 0 });
  }
  async function updateFooterLink(id: string, patch: Partial<AdminFooterLink>) {
    const current = footer.find((f) => f.id === id);
    if (!current) return;
    const updated = await adminUpdateFooterLink(id, { ...current, ...patch });
    setFooter((cur) => cur.map((f) => (f.id === id ? updated : f)));
  }
  async function deleteFooterLink(id: string) {
    if (!confirm("Delete this footer link?")) return;
    await adminDeleteFooterLink(id);
    setFooter((cur) => cur.filter((f) => f.id !== id));
  }

  async function addSocial() {
    const created = await adminCreateSocialLink(newSocial);
    setSocial((cur) => [...cur, created]);
    setNewSocial({ label: "", href: "", sortIndex: 0 });
  }
  async function updateSocial(label: string, patch: { href: string; sortIndex: number }) {
    const updated = await adminUpdateSocialLink(label, patch);
    setSocial((cur) => cur.map((s) => (s.label === label ? updated : s)));
  }
  async function deleteSocial(label: string) {
    if (!confirm(`Delete ${label}?`)) return;
    await adminDeleteSocialLink(label);
    setSocial((cur) => cur.filter((s) => s.label !== label));
  }

  async function addTerm() {
    const created = await adminCreateTrendingTerm(newTerm);
    setTrending((cur) => [...cur, created]);
    setNewTerm({ term: "", sortIndex: 0 });
  }
  async function deleteTerm(term: string) {
    if (!confirm(`Delete "${term}"?`)) return;
    await adminDeleteTrendingTerm(term);
    setTrending((cur) => cur.filter((t) => t.term !== term));
  }

  return (
    <div className="space-y-8">
      <header><h1 className="coco-heading">Footer</h1></header>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Contact</h2>
        <ContentBlockEditor blockKey="footer.contact" type="FooterContact" data={contactDraft} onChange={setContactDraft} />
        <div className="flex items-center gap-3">
          <button className="coco-button-primary disabled:opacity-60" disabled={contactSaving} onClick={saveContact} type="button">
            {contactSaving ? "Saving…" : "Save contact"}
          </button>
          {contactSavedAt ? <span className="text-xs text-cocoa-mint">Saved at {contactSavedAt}</span> : null}
        </div>
      </section>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Footer link groups</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cocoa-line text-left text-cocoa-text">
              <th className="py-2">Group</th><th>Label</th><th>Href</th><th>Order</th><th />
            </tr>
          </thead>
          <tbody>
            {footer.map((f) => (
              <tr key={f.id} className="border-b border-cocoa-line">
                <td className="py-2"><input className="coco-input w-40" defaultValue={f.groupTitle} onBlur={(e) => updateFooterLink(f.id, { groupTitle: e.target.value })} /></td>
                <td><input className="coco-input w-48" defaultValue={f.label} onBlur={(e) => updateFooterLink(f.id, { label: e.target.value })} /></td>
                <td><input className="coco-input w-64" defaultValue={f.href} onBlur={(e) => updateFooterLink(f.id, { href: e.target.value })} /></td>
                <td><input className="coco-input w-16" defaultValue={f.sortIndex} onBlur={(e) => updateFooterLink(f.id, { sortIndex: Number(e.target.value) })} type="number" /></td>
                <td className="text-right"><button className="text-cocoa-coral underline" onClick={() => deleteFooterLink(f.id)} type="button">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-5 gap-2">
          <input className="coco-input" placeholder="groupKey" value={newLink.groupKey} onChange={(e) => setNewLink({ ...newLink, groupKey: e.target.value })} />
          <input className="coco-input" placeholder="Group title" value={newLink.groupTitle} onChange={(e) => setNewLink({ ...newLink, groupTitle: e.target.value })} />
          <input className="coco-input" placeholder="Label" value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} />
          <input className="coco-input" placeholder="/href" value={newLink.href} onChange={(e) => setNewLink({ ...newLink, href: e.target.value })} />
          <button className="coco-button-secondary" onClick={addFooterLink} type="button">+ Add</button>
        </div>
      </section>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Social links</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-cocoa-line text-left text-cocoa-text"><th className="py-2">Label</th><th>Href</th><th>Order</th><th /></tr></thead>
          <tbody>
            {social.map((s) => (
              <tr key={s.label} className="border-b border-cocoa-line">
                <td className="py-2 font-semibold">{s.label}</td>
                <td><input className="coco-input w-64" defaultValue={s.href} onBlur={(e) => updateSocial(s.label, { href: e.target.value, sortIndex: s.sortIndex })} /></td>
                <td><input className="coco-input w-16" defaultValue={s.sortIndex} onBlur={(e) => updateSocial(s.label, { href: s.href, sortIndex: Number(e.target.value) })} type="number" /></td>
                <td className="text-right"><button className="text-cocoa-coral underline" onClick={() => deleteSocial(s.label)} type="button">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid grid-cols-4 gap-2">
          <input className="coco-input" placeholder="Label (e.g. Instagram)" value={newSocial.label} onChange={(e) => setNewSocial({ ...newSocial, label: e.target.value })} />
          <input className="coco-input col-span-2" placeholder="https://…" value={newSocial.href} onChange={(e) => setNewSocial({ ...newSocial, href: e.target.value })} />
          <button className="coco-button-secondary" onClick={addSocial} type="button">+ Add</button>
        </div>
      </section>

      <section className="coco-panel space-y-3 p-6">
        <h2 className="text-lg font-bold">Search trending terms</h2>
        <ul className="space-y-1 text-sm">
          {trending.map((t) => (
            <li key={t.term} className="flex items-center gap-2">
              <span className="flex-1">{t.term}</span>
              <button className="text-cocoa-coral underline" onClick={() => deleteTerm(t.term)} type="button">Delete</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="coco-input flex-1" placeholder="New term" value={newTerm.term} onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })} />
          <button className="coco-button-secondary" disabled={!newTerm.term} onClick={addTerm} type="button">+ Add</button>
        </div>
      </section>
    </div>
  );
}
