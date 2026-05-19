"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { collectionSortLabels, type SortKey } from "@/data/collections";

const pageSizes = ["10", "15", "20", "25", "30", "50"];
const sortKeys = Object.keys(collectionSortLabels) as SortKey[];

export function CollectionToolbar({
  count,
  pageSize,
  sort,
}: {
  count: number;
  pageSize: number;
  sort: SortKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-8 flex flex-col gap-4 rounded-coco border border-cocoa-line bg-white px-5 py-4 text-sm shadow-soft md:flex-row md:items-center md:justify-between">
      <p className="font-bold text-cocoa-text">{count} results</p>
      <div className="flex flex-wrap gap-4">
        <label className="grid gap-1 font-bold text-cocoa-text">
          Items per page
          <select
            className="min-h-10 rounded-full border border-cocoa-line bg-white px-4 text-cocoa-ink"
            onChange={(event) => updateParam("pageSize", event.target.value)}
            value={String(pageSize)}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 font-bold text-cocoa-text">
          Sort by
          <select
            className="min-h-10 rounded-full border border-cocoa-line bg-white px-4 text-cocoa-ink"
            onChange={(event) => updateParam("sort", event.target.value)}
            value={sort}
          >
            {sortKeys.map((key) => (
              <option key={key} value={key}>
                {collectionSortLabels[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
