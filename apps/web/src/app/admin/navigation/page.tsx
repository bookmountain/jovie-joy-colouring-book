"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminListNavigation,
  adminReplaceNavigation,
  type AdminNavigationItem,
} from "@/lib/adminApi";
import {
  AdminButton,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
  AdminSwitch,
} from "@/components/admin/ui";
import { notifyError, notifySaved } from "@/lib/toast";

type NavigationBranch = AdminNavigationItem & { children: NavigationBranch[] };

function sortAndNormalize(items: AdminNavigationItem[]): AdminNavigationItem[] {
  const siblingIds = new Map<string, AdminNavigationItem[]>();
  for (const item of items) {
    const key = item.parentId ?? "root";
    const siblings = siblingIds.get(key) ?? [];
    siblings.push(item);
    siblingIds.set(key, siblings);
  }
  const sortById = new Map<string, number>();
  for (const siblings of siblingIds.values()) {
    siblings
      .sort((left, right) => left.sortIndex - right.sortIndex || left.label.localeCompare(right.label))
      .forEach((item, index) => sortById.set(item.id, index));
  }
  return items.map((item) => ({
    ...item,
    enabled: item.enabled !== false,
    sortIndex: sortById.get(item.id) ?? 0,
  }));
}

function buildTree(items: AdminNavigationItem[]): NavigationBranch[] {
  const childrenByParent = new Map<string, AdminNavigationItem[]>();
  for (const item of items) {
    const key = item.parentId ?? "root";
    const siblings = childrenByParent.get(key) ?? [];
    siblings.push(item);
    childrenByParent.set(key, siblings);
  }
  const build = (item: AdminNavigationItem): NavigationBranch => ({
    ...item,
    children: (childrenByParent.get(item.id) ?? [])
      .sort((left, right) => left.sortIndex - right.sortIndex)
      .map(build),
  });
  return (childrenByParent.get("root") ?? [])
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map(build);
}

function descendantIds(items: AdminNavigationItem[], id: string): Set<string> {
  const found = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId && found.has(item.parentId) && !found.has(item.id)) {
        found.add(item.id);
        changed = true;
      }
    }
  }
  return found;
}

type NavigationRowProps = {
  branch: NavigationBranch;
  depth: number;
  siblingCount: number;
  onAddChild: (parentId: string) => void;
  onDelete: (item: AdminNavigationItem) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onUpdate: (id: string, patch: Partial<AdminNavigationItem>) => void;
};

function NavigationRow({
  branch,
  depth,
  siblingCount,
  onAddChild,
  onDelete,
  onMove,
  onUpdate,
}: NavigationRowProps) {
  return (
    <div className="space-y-2" data-nav-depth={depth}>
      <div
        className="admin-navigation-row"
        style={{ marginLeft: `${(depth - 1) * 24}px` }}
      >
        <div className="admin-navigation-level">Level {depth}</div>
        <div className="admin-field">
          <label className="admin-label" htmlFor={`nav-label-${branch.id}`}>Label</label>
          <AdminInput
            id={`nav-label-${branch.id}`}
            maxLength={120}
            onChange={(event) => onUpdate(branch.id, { label: event.target.value })}
            value={branch.label}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label" htmlFor={`nav-href-${branch.id}`}>Link</label>
          <AdminInput
            id={`nav-href-${branch.id}`}
            maxLength={500}
            onChange={(event) => onUpdate(branch.id, { href: event.target.value })}
            placeholder="/products"
            value={branch.href}
          />
        </div>
        <div className="admin-navigation-actions">
          <div className="flex items-center gap-2 pr-1">
            <span className="text-xs font-semibold text-cocoa-text">
              {branch.enabled ? "Visible" : "Hidden"}
            </span>
            <AdminSwitch
              aria-label={`${branch.enabled ? "Hide" : "Show"} ${branch.label || "link"} on storefront`}
              checked={branch.enabled}
              onChange={(enabled) => onUpdate(branch.id, { enabled })}
              title={branch.enabled ? "Visible; click to hide" : "Hidden; click to show"}
            />
          </div>
          <AdminButton
            aria-label={`Move ${branch.label || "link"} up`}
            disabled={branch.sortIndex === 0}
            onClick={() => onMove(branch.id, -1)}
            size="sm"
            type="button"
            variant="ghost"
          >
            ↑
          </AdminButton>
          <AdminButton
            aria-label={`Move ${branch.label || "link"} down`}
            disabled={branch.sortIndex >= siblingCount - 1}
            onClick={() => onMove(branch.id, 1)}
            size="sm"
            type="button"
            variant="ghost"
          >
            ↓
          </AdminButton>
          {depth < 3 ? (
            <AdminButton
              aria-label={`Add child to ${branch.label || "link"}`}
              onClick={() => onAddChild(branch.id)}
              size="sm"
              type="button"
              variant="ghost"
            >
              + Child
            </AdminButton>
          ) : null}
          <AdminButton
            aria-label={`Delete ${branch.label || "link"}`}
            onClick={() => onDelete(branch)}
            size="sm"
            type="button"
            variant="danger"
          >
            Delete
          </AdminButton>
        </div>
      </div>
      {branch.children.map((child) => (
        <NavigationRow
          branch={child}
          depth={depth + 1}
          key={child.id}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onMove={onMove}
          onUpdate={onUpdate}
          siblingCount={branch.children.length}
        />
      ))}
    </div>
  );
}

export default function AdminNavigationPage() {
  const [items, setItems] = useState<AdminNavigationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminNavigationItem | null>(null);

  useEffect(() => {
    adminListNavigation()
      .then((response) => {
        setItems(sortAndNormalize(response.items));
        setRevision(response.revision);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const tree = useMemo(() => buildTree(items), [items]);
  const invalid = !revision || items.length === 0 || items.some((item) => !item.label.trim() || !item.href.trim());

  function update(id: string, patch: Partial<AdminNavigationItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function add(parentId: string | null) {
    setItems((current) => {
      const siblings = current.filter((item) => item.parentId === parentId);
      return [...current, {
        id: crypto.randomUUID(),
        parentId,
        label: "New link",
        href: "/",
        sortIndex: siblings.length,
        enabled: true,
      }];
    });
  }

  function move(id: string, direction: -1 | 1) {
    setItems((current) => {
      const moving = current.find((item) => item.id === id);
      if (!moving) return current;
      const siblings = current
        .filter((item) => item.parentId === moving.parentId)
        .sort((left, right) => left.sortIndex - right.sortIndex);
      const from = siblings.findIndex((item) => item.id === id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= siblings.length) return current;
      [siblings[from], siblings[to]] = [siblings[to], siblings[from]];
      const sortIndexes = new Map(siblings.map((item, index) => [item.id, index]));
      return current.map((item) => sortIndexes.has(item.id)
        ? { ...item, sortIndex: sortIndexes.get(item.id)! }
        : item);
    });
  }

  function remove(item: AdminNavigationItem) {
    setItems((current) => {
      const removeIds = descendantIds(current, item.id);
      return sortAndNormalize(current.filter((candidate) => !removeIds.has(candidate.id)));
    });
    setPendingDelete(null);
  }

  async function save() {
    if (invalid) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await adminReplaceNavigation(sortAndNormalize(items), revision);
      setItems(sortAndNormalize(saved.items));
      setRevision(saved.revision);
      notifySaved("Navigation");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Navigation save failed");
      notifyError(reason);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        crumb="Site content"
        title="Navigation"
        subtitle="Edit the desktop and mobile storefront menus. Switching off a normal local content link also makes that route return Not Found; Home and checkout/account utilities stay accessible. Content remains saved. Links support up to three levels."
        actions={<AdminButton onClick={() => add(null)} type="button" variant="ghost">+ Top-level link</AdminButton>}
      />

      {error ? <p className="text-sm text-cocoa-coral" role="alert">{error}</p> : null}
      {loading ? <AdminPanel>Loading navigation…</AdminPanel> : null}
      {!loading && items.length === 0 ? (
        <AdminEmptyState
          heading="Navigation needs at least one link"
          body="Add a top-level link to begin."
          action={<AdminButton onClick={() => add(null)} type="button" variant="primary">Add link</AdminButton>}
        />
      ) : null}
      {!loading && tree.length > 0 ? (
        <AdminPanel className="space-y-3">
          <p className="panel-hint">Use child links to create dropdown menus. Deleting a link also removes its descendants.</p>
          {tree.map((branch) => (
            <NavigationRow
              branch={branch}
              depth={1}
              key={branch.id}
              onAddChild={(parentId) => add(parentId)}
              onDelete={setPendingDelete}
              onMove={move}
              onUpdate={update}
              siblingCount={tree.length}
            />
          ))}
          <div className="flex items-center gap-3 pt-3">
            <AdminButton disabled={saving || invalid} onClick={save} type="button" variant="primary">
              {saving ? "Saving…" : "Save navigation"}
            </AdminButton>
            {invalid ? <span className="text-xs text-cocoa-coral">Every link needs a label and href.</span> : null}
          </div>
        </AdminPanel>
      ) : null}

      <AdminConfirmDialog
        body="This link and every child below it will be removed when you save navigation."
        confirmLabel="Remove link"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { if (pendingDelete) remove(pendingDelete); }}
        open={pendingDelete !== null}
        title={`Remove “${pendingDelete?.label ?? "this link"}”?`}
      />
    </div>
  );
}
