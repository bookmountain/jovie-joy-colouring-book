"use client";

import { useBundle } from "@/state/catalog-provider";
import { resolveAssetUrl } from "@/lib/api";

const COCOWYO_PLACEHOLDER =
  "https://cocowyo.com/cdn/shop/files/Sticky-bar-purple_2048x.png?v=1766717451";

export function AnnouncementBar() {
  const bundle = useBundle();
  const ann = bundle.announcement[0]?.data;

  const bg = ann?.backgroundImage ? resolveAssetUrl(ann.backgroundImage) : COCOWYO_PLACEHOLDER;

  if (!ann || !ann.enabled) {
    return (
      <div
        className="min-h-[37px] bg-cocoa-lavender bg-cover bg-center px-4 py-[7px] text-center text-[17px] font-bold leading-6 text-cocoa-ink"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <span className="tracking-[0.04em]">Welcome to cozy world</span>
      </div>
    );
  }

  return (
    <a
      className="block min-h-[37px] bg-cocoa-lavender bg-cover bg-center px-4 py-[7px] text-center text-[17px] font-bold leading-6 text-cocoa-ink"
      href={ann.href || "#"}
      style={{ backgroundImage: `url(${bg})` }}
    >
      <span className="tracking-[0.04em]">{ann.text}</span>
    </a>
  );
}
