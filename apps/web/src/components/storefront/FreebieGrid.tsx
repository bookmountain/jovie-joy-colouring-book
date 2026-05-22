"use client";

import { useState } from "react";
import { FreebieCard } from "./FreebieCard";
import { EmailGateModal } from "./EmailGateModal";
import type { FreebieListItem } from "@/lib/freebies";

export function FreebieGrid({ items, downloadBanner }: { items: FreebieListItem[]; downloadBanner: "expired" | "invalid" | null }) {
  const [active, setActive] = useState<FreebieListItem | null>(null);

  return (
    <div className="space-y-6">
      {downloadBanner ? (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {downloadBanner === "expired"
            ? "That download link has expired — submit your email again to get a fresh one."
            : "That download link wasn't recognised. Submit your email again to get a fresh one."}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <FreebieCard key={item.slug} item={item} onOpen={setActive} />
        ))}
      </div>
      {active ? <EmailGateModal item={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}
