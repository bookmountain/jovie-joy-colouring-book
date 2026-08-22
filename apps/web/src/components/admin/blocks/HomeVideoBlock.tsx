"use client";

import { useRef, useState } from "react";
import type { ContentBlockEditorProps } from "@/components/admin/ContentBlockEditor";
import { AdminButton } from "@/components/admin/ui";
import { adminUploadContentVideo } from "@/lib/adminApi";
import { resolveAssetUrl } from "@/lib/api";

type Data = { videos?: string[]; src?: string; youtubeHref?: string };

const SLOTS = 3;

function readVideos(d: Data): (string | null)[] {
  const list = Array.isArray(d.videos)
    ? d.videos.filter(Boolean)
    : d.src?.startsWith("/uploads/") ? [d.src] : [];
  return Array.from({ length: SLOTS }, (_, i) => list[i] ?? null);
}

function VideoSlot({
  index,
  src,
  blockKey,
  onUploaded,
  onRemove,
}: {
  index: number;
  src: string | null;
  blockKey: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = progress !== null;

  async function handlePick(file: File) {
    setError(null);
    setProgress(0);
    try {
      const { url } = await adminUploadContentVideo(blockKey, file, setProgress);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative overflow-hidden rounded-coco-sm border bg-white ${src ? "border-cocoa-line" : "border-dashed border-cocoa-line hover:border-cocoa-purple"} ${busy ? "opacity-80" : "cursor-pointer"}`}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        style={{ aspectRatio: "9 / 16", maxHeight: 280 }}
        tabIndex={0}
        onKeyDown={(e) => { if (!busy && (e.key === "Enter" || e.key === " ")) inputRef.current?.click(); }}
      >
        {src ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            controls
            muted
            onClick={(e) => e.stopPropagation()}
            preload="metadata"
            src={resolveAssetUrl(src)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center text-xs text-cocoa-text">
            <span aria-hidden className="text-2xl leading-none">↑</span>
            <span className="font-semibold">Video {index + 1}</span>
            <span className="opacity-70">MP4 or WebM, up to 1 GB</span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 px-4 text-sm font-semibold text-cocoa-ink">
            <span>Uploading… {Math.round((progress ?? 0) * 100)}%</span>
            <div className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-cocoa-line">
              <div className="h-full bg-cocoa-purple transition-[width]" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminButton
          disabled={busy}
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          type="button"
          variant="ghost"
        >
          {src ? "Replace" : "Upload"}
        </AdminButton>
        {src ? (
          <button
            className="text-xs text-cocoa-coral underline"
            disabled={busy}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            type="button"
          >
            Remove
          </button>
        ) : null}
      </div>

      <input
        accept="video/mp4,video/webm,.mp4,.m4v,.webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePick(f);
          e.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      {error ? <p className="text-xs text-cocoa-coral">{error}</p> : null}
    </div>
  );
}

export function HomeVideoBlock({ blockKey, data, onChange }: ContentBlockEditorProps) {
  const d = (data ?? {}) as Data;
  const slots = readVideos(d);
  // Uploads can run in parallel; read the latest slots through a ref so a slow
  // finish doesn't overwrite a faster one with stale state.
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  function writeSlot(index: number, value: string | null) {
    const next = slotsRef.current.map((s, j) => (j === index ? value : s));
    // Always write the new `videos` shape and drop the legacy link fields.
    onChange({ videos: next.filter(Boolean), src: undefined, youtubeHref: undefined });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-cocoa-text">
        Three portrait videos shown side by side on the home page. They autoplay
        muted, with no click-through link. Remember to press Save after uploading.
      </p>
      <div className="grid grid-cols-3 gap-3" style={{ maxWidth: 560 }}>
        {slots.map((src, i) => (
          <VideoSlot
            blockKey={blockKey}
            index={i}
            key={i}
            onRemove={() => writeSlot(i, null)}
            onUploaded={(url) => writeSlot(i, url)}
            src={src}
          />
        ))}
      </div>
    </div>
  );
}
