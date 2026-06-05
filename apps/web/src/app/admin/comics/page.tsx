"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  adminListComicWorlds,
  adminCreateComicWorld,
  adminUpdateComicWorld,
  adminDeleteComicWorld,
  type AdminComicWorld,
} from "@/lib/adminApi";
import { StaticPageHeaderEditor } from "@/components/admin/StaticPageHeaderEditor";
import {
  AdminButton,
  AdminConfirmDialog,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/ui";
import { notifySaved, notifyDeleted, notifyError } from "@/lib/toast";

export default function AdminComicsPage() {
  const [worlds, setWorlds] = useState<AdminComicWorld[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSort, setDraftSort] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminComicWorld | null>(null);

  useEffect(() => {
    adminListComicWorlds().then(setWorlds).catch((e: Error) => setError(e.message));
  }, []);

  function update(id: string, patch: Partial<AdminComicWorld>) {
    setWorlds((cur) => cur.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  async function save(world: AdminComicWorld) {
    setError(null);
    try {
      const saved = await adminUpdateComicWorld(world.id, {
        title: world.title, sortIndex: world.sortIndex,
      });
      update(world.id, saved);
      notifySaved("World");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      notifyError(e);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await adminDeleteComicWorld(id);
      setWorlds((cur) => cur.filter((w) => w.id !== id));
      notifyDeleted("World");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      notifyError(e);
    } finally {
      setPendingDelete(null);
    }
  }

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const created = await adminCreateComicWorld({ title: draftTitle, sortIndex: draftSort });
      setWorlds((cur) => [...cur, created]);
      setDraftTitle("");
      setDraftSort(0);
      notifySaved("World");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      notifyError(e);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Comics"
        subtitle="Manage comic worlds and the comics inside each one. Click a world to edit its comics + images."
      />

      <StaticPageHeaderEditor slug="comics" heading="Page header" hint="Title + intro shown on /pages/comics." />

      {error ? <p className="text-sm text-cocoa-coral">{error}</p> : null}

      {worlds.map((world) => (
        <AdminPanel className="space-y-3" key={world.id}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{world.title || world.id}</h2>
            <Link className="text-xs text-cocoa-purple underline" href={`/admin/comics/${world.id}`}>
              Manage comics ({world.comics.length}) →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField>
              <AdminLabel htmlFor={`cw-title-${world.id}`}>Title</AdminLabel>
              <AdminInput
                id={`cw-title-${world.id}`}
                onChange={(e) => update(world.id, { title: e.target.value })}
                value={world.title}
              />
            </AdminField>
            <AdminField>
              <AdminLabel htmlFor={`cw-sort-${world.id}`}>Sort index</AdminLabel>
              <AdminInput
                id={`cw-sort-${world.id}`}
                inputMode="numeric"
                onChange={(e) => update(world.id, { sortIndex: Number(e.target.value) || 0 })}
                value={String(world.sortIndex)}
              />
            </AdminField>
          </div>
          <div className="flex items-center gap-3">
            <AdminButton onClick={() => save(world)} type="button" variant="primary">Save</AdminButton>
            <button
              className="text-xs text-cocoa-coral underline"
              onClick={() => setPendingDelete(world)}
              type="button"
            >
              Delete
            </button>
          </div>
        </AdminPanel>
      ))}

      <AdminConfirmDialog
        open={!!pendingDelete}
        title={`Delete "${pendingDelete?.title || "this world"}"?`}
        body="This deletes the comic world AND all its comics. This cannot be undone."
        confirmLabel="Delete world"
        destructive
        onConfirm={() => {
          if (pendingDelete) return remove(pendingDelete.id);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <AdminPanel className="space-y-3">
        <h2 className="text-lg font-bold">Add new world</h2>
        <AdminField>
          <AdminLabel htmlFor="cw-new-title">Title</AdminLabel>
          <AdminInput
            id="cw-new-title"
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="e.g. Spooky Cutie World"
            value={draftTitle}
          />
        </AdminField>
        <AdminField>
          <AdminLabel htmlFor="cw-new-sort">Sort index</AdminLabel>
          <AdminInput
            id="cw-new-sort"
            inputMode="numeric"
            onChange={(e) => setDraftSort(Number(e.target.value) || 0)}
            value={String(draftSort)}
          />
        </AdminField>
        <AdminButton
          disabled={creating || !draftTitle}
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
