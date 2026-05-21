"use client";

import { useEffect, useState } from "react";
import {
  adminListAboutSections,
  adminCreateAboutSection,
  adminUpdateAboutSection,
  adminDeleteAboutSection,
  adminUploadAboutImage,
  type AdminAboutSection,
} from "@/lib/adminApi";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { StaticPageHeaderEditor } from "@/components/admin/StaticPageHeaderEditor";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/ui";

type SectionDraft = {
  id: string;
  title: string;
  bodyText: string;
  image: string;
  alt: string;
  background: string;
  sortIndex: number;
};

function toDraft(s: AdminAboutSection): SectionDraft {
  return {
    id: s.id,
    title: s.title,
    bodyText: s.body.join("\n\n"),
    image: s.image,
    alt: s.alt,
    background: s.background,
    sortIndex: s.sortIndex,
  };
}

function bodyFromText(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

const NEW_DRAFT = {
  title: "",
  bodyText: "",
  image: "",
  alt: "",
  background: "",
  sortIndex: 0,
};

export default function AdminAboutPage() {
  const [rows, setRows] = useState<SectionDraft[]>([]);
  const [newDraft, setNewDraft] = useState({ ...NEW_DRAFT });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminListAboutSections()
      .then((rs) => setRows(rs.map(toDraft)))
      .catch((e: Error) => setError(e.message));
  }, []);

  function update(id: string, patch: Partial<SectionDraft>) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save(row: SectionDraft) {
    setError(null);
    try {
      const saved = await adminUpdateAboutSection(row.id, {
        title: row.title,
        body: bodyFromText(row.bodyText),
        image: row.image,
        alt: row.alt,
        background: row.background,
        sortIndex: row.sortIndex,
      });
      update(row.id, toDraft(saved));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this About section?")) return;
    setError(null);
    try {
      await adminDeleteAboutSection(id);
      setRows((cur) => cur.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const created = await adminCreateAboutSection({
        title: newDraft.title,
        body: bodyFromText(newDraft.bodyText),
        image: newDraft.image,
        alt: newDraft.alt,
        background: newDraft.background,
        sortIndex: newDraft.sortIndex,
      });
      setRows((cur) => [...cur, toDraft(created)]);
      setNewDraft({ ...NEW_DRAFT });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="About page"
        subtitle="Sections rendered on /pages/about-us. Each section has its own image, title, body paragraphs (separated by a blank line), alt text, and background colour."
      />

      <StaticPageHeaderEditor slug="about-us" heading="Page header" hint="Title + intro shown above the section list on the public page." />

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}

      {rows.map((row) => (
        <AdminPanel className="space-y-3" key={row.id}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{row.title || "Untitled section"}</h2>
            <code className="text-xs text-cocoa-text">{row.id.slice(0, 8)}</code>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`ab-title-${row.id}`}>Title</AdminLabel>
              <AdminInput
                id={`ab-title-${row.id}`}
                onChange={(e) => update(row.id, { title: e.target.value })}
                value={row.title}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`ab-sort-${row.id}`}>Sort index</AdminLabel>
              <AdminInput
                id={`ab-sort-${row.id}`}
                inputMode="numeric"
                onChange={(e) => update(row.id, { sortIndex: Number(e.target.value) || 0 })}
                value={String(row.sortIndex)}
              />
            </AdminField>
          </div>
          <AdminField>
            <AdminLabel htmlFor={`ab-body-${row.id}`}>Body (blank line = new paragraph)</AdminLabel>
            <AdminTextarea
              id={`ab-body-${row.id}`}
              onChange={(e) => update(row.id, { bodyText: e.target.value })}
              rows={6}
              value={row.bodyText}
            />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`ab-alt-${row.id}`}>Image alt text</AdminLabel>
              <AdminInput
                id={`ab-alt-${row.id}`}
                onChange={(e) => update(row.id, { alt: e.target.value })}
                value={row.alt}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`ab-bg-${row.id}`}>Background colour (hex)</AdminLabel>
              <AdminInput
                id={`ab-bg-${row.id}`}
                onChange={(e) => update(row.id, { background: e.target.value })}
                placeholder="#f9eedd"
                value={row.background}
              />
            </AdminField>
          </div>
          <ImageUpload
            label="Section image"
            onChange={(url) => update(row.id, { image: url ?? "" })}
            upload={(f) => adminUploadAboutImage(row.id, f)}
            value={row.image || null}
            variant="banner"
          />
          <div className="flex items-center gap-3">
            <AdminButton onClick={() => save(row)} type="button" variant="primary">Save</AdminButton>
            <button
              className="text-xs text-cocoa-coral underline"
              onClick={() => remove(row.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        </AdminPanel>
      ))}

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Add new section</h2>
        <AdminField>
          <AdminLabel htmlFor="ab-new-title">Title</AdminLabel>
          <AdminInput
            id="ab-new-title"
            onChange={(e) => setNewDraft({ ...newDraft, title: e.target.value })}
            value={newDraft.title}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="ab-new-body">Body</AdminLabel>
          <AdminTextarea
            id="ab-new-body"
            onChange={(e) => setNewDraft({ ...newDraft, bodyText: e.target.value })}
            rows={4}
            value={newDraft.bodyText}
          />
        </AdminField>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField>
            <AdminLabel htmlFor="ab-new-alt">Image alt text</AdminLabel>
            <AdminInput
              id="ab-new-alt"
              onChange={(e) => setNewDraft({ ...newDraft, alt: e.target.value })}
              value={newDraft.alt}
            />
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor="ab-new-bg">Background colour (hex)</AdminLabel>
            <AdminInput
              id="ab-new-bg"
              onChange={(e) => setNewDraft({ ...newDraft, background: e.target.value })}
              placeholder="#f9eedd"
              value={newDraft.background}
            />
          </AdminField>
        </div>
        <p className="text-xs text-cocoa-text">Create the section first, then upload the image on the resulting card.</p>
        <AdminButton
          disabled={creating || !newDraft.title}
          onClick={create}
          type="button"
          variant="primary"
        >
          {creating ? "Creating…" : "Create"}
        </AdminButton>
      </AdminPanel>
    </div>
  );
}
