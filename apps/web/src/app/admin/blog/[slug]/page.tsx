"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  adminListArticles,
  adminCreateArticle,
  adminUpdateArticle,
  adminDeleteArticle,
  adminUploadArticleImage,
  type AdminArticle,
} from "@/lib/adminApi";
import { ImageUpload } from "@/components/admin/ImageUpload";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/ui";

type ArticleDraft = {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  bodyText: string;
  sortIndex: number;
};

const EMPTY_DRAFT: ArticleDraft = {
  slug: "", title: "", excerpt: "", image: "", bodyText: "", sortIndex: 0,
};

function articleToDraft(a: AdminArticle): ArticleDraft {
  return {
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    image: a.image,
    bodyText: a.body.join("\n\n"),
    sortIndex: a.sortIndex ?? 0,
  };
}

function draftToBody(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

export default function AdminBlogArticlesPage() {
  const params = useParams();
  const categorySlug = (params?.slug as string) ?? "";

  const [rows, setRows] = useState<ArticleDraft[]>([]);
  const [newDraft, setNewDraft] = useState<ArticleDraft>({ ...EMPTY_DRAFT });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categorySlug) return;
    adminListArticles(categorySlug)
      .then((rs) => setRows(rs.map(articleToDraft)))
      .catch((e: Error) => setError(e.message));
  }, [categorySlug]);

  function update(slug: string, patch: Partial<ArticleDraft>) {
    setRows((cur) => cur.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));
  }

  async function save(row: ArticleDraft) {
    setError(null);
    try {
      const saved = await adminUpdateArticle(categorySlug, row.slug, {
        title: row.title,
        excerpt: row.excerpt,
        image: row.image,
        body: draftToBody(row.bodyText),
        sortIndex: row.sortIndex,
      });
      update(row.slug, articleToDraft(saved));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function remove(slug: string) {
    if (!confirm(`Delete article "${slug}"?`)) return;
    setError(null);
    try {
      await adminDeleteArticle(categorySlug, slug);
      setRows((cur) => cur.filter((r) => r.slug !== slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const created = await adminCreateArticle(categorySlug, {
        slug: newDraft.slug,
        title: newDraft.title,
        excerpt: newDraft.excerpt,
        image: newDraft.image,
        body: draftToBody(newDraft.bodyText),
        sortIndex: newDraft.sortIndex,
      });
      setRows((cur) => [...cur, articleToDraft(created)]);
      setNewDraft({ ...EMPTY_DRAFT });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        crumb={<Link className="text-cocoa-purple underline" href="/admin/blog">← Back to blog categories</Link>}
        title={`Articles in "${categorySlug}"`}
        subtitle="Body paragraphs are separated by a blank line."
      />

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}

      {rows.map((row) => (
        <AdminPanel className="space-y-3" key={row.slug}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{row.title || row.slug}</h2>
            <code className="text-xs text-cocoa-text">{row.slug}</code>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`a-title-${row.slug}`}>Title</AdminLabel>
              <AdminInput
                id={`a-title-${row.slug}`}
                onChange={(e) => update(row.slug, { title: e.target.value })}
                value={row.title}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`a-sort-${row.slug}`}>Sort index</AdminLabel>
              <AdminInput
                id={`a-sort-${row.slug}`}
                inputMode="numeric"
                onChange={(e) => update(row.slug, { sortIndex: Number(e.target.value) || 0 })}
                value={String(row.sortIndex)}
              />
            </AdminField>
          </div>
          <AdminField>
            <AdminLabel htmlFor={`a-excerpt-${row.slug}`}>Excerpt</AdminLabel>
            <AdminTextarea
              id={`a-excerpt-${row.slug}`}
              onChange={(e) => update(row.slug, { excerpt: e.target.value })}
              rows={2}
              value={row.excerpt}
            />
          </AdminField>
          <AdminField>
            <AdminLabel htmlFor={`a-body-${row.slug}`}>Body</AdminLabel>
            <AdminTextarea
              id={`a-body-${row.slug}`}
              onChange={(e) => update(row.slug, { bodyText: e.target.value })}
              rows={10}
              value={row.bodyText}
            />
          </AdminField>
          <ImageUpload
            label="Hero image"
            onChange={(url) => update(row.slug, { image: url ?? "" })}
            upload={(f) => adminUploadArticleImage(categorySlug, row.slug, f)}
            value={row.image || null}
          />
          <div className="flex items-center gap-3">
            <AdminButton onClick={() => save(row)} type="button" variant="primary">Save</AdminButton>
            <button
              className="text-xs text-cocoa-coral underline"
              onClick={() => remove(row.slug)}
              type="button"
            >
              Delete
            </button>
          </div>
        </AdminPanel>
      ))}

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Add new article</h2>
        <AdminField>
          <AdminLabel htmlFor="a-new-slug">Slug</AdminLabel>
          <AdminInput
            id="a-new-slug"
            onChange={(e) => setNewDraft({ ...newDraft, slug: e.target.value })}
            placeholder="e.g. how-to-blend-pencils"
            value={newDraft.slug}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="a-new-title">Title</AdminLabel>
          <AdminInput
            id="a-new-title"
            onChange={(e) => setNewDraft({ ...newDraft, title: e.target.value })}
            value={newDraft.title}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="a-new-excerpt">Excerpt</AdminLabel>
          <AdminTextarea
            id="a-new-excerpt"
            onChange={(e) => setNewDraft({ ...newDraft, excerpt: e.target.value })}
            rows={2}
            value={newDraft.excerpt}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="a-new-body">Body</AdminLabel>
          <AdminTextarea
            id="a-new-body"
            onChange={(e) => setNewDraft({ ...newDraft, bodyText: e.target.value })}
            rows={6}
            value={newDraft.bodyText}
          />
        </AdminField>
        <p className="text-xs text-cocoa-text">After creating, upload the hero image on the resulting card.</p>
        <AdminButton
          disabled={creating || !newDraft.slug || !newDraft.title}
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
