"use client";

import { resolveAssetUrl } from "@/lib/api";
import type { FreebieListItem } from "@/lib/freebies";

function formatBytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FreebieCard({ item, onOpen }: { item: FreebieListItem; onOpen: (item: FreebieListItem) => void }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-cocoa-line bg-white shadow-sm">
      <div className="aspect-[4/3] w-full overflow-hidden bg-cocoa-cream">
        {item.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveAssetUrl(item.coverImage)} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-bold text-cocoa-ink">{item.title}</h3>
        <p className="text-sm text-cocoa-text">{item.excerpt}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-cocoa-muted">
          <span className="rounded-full bg-cocoa-cream px-2 py-0.5 font-semibold uppercase">{item.fileKind}</span>
          {item.fileSizeBytes ? <span>{formatBytes(item.fileSizeBytes)}</span> : null}
        </div>
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-cocoa-purple px-4 py-2 text-sm font-semibold text-white hover:bg-cocoa-purple-dark"
        >
          Get for free →
        </button>
      </div>
    </article>
  );
}
