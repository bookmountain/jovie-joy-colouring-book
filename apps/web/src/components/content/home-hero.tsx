"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { resolveAssetUrl, type HeroSlide } from "@/lib/api";

type Props = {
  slides: HeroSlide[];
  intervalMs?: number;
};

export function HomeHero({ slides, intervalMs = 5000 }: Props) {
  const visible = useMemo(() => slides.filter((s) => s.image), [slides]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (visible.length <= 1 || intervalMs <= 0) return;
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % visible.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [visible.length, intervalMs]);

  if (visible.length === 0) return null;

  const slide = visible[Math.min(active, visible.length - 1)];

  return (
    <section className="bg-white pb-7 pt-[15px]">
      <div className="mx-auto max-w-[1470px] px-4">
        <Link
          aria-label={slide.label || "Featured banner"}
          className="group relative block aspect-[5/8] overflow-hidden rounded-coco-sm bg-cocoa-cream md:aspect-[2/1]"
          href={slide.href || "#"}
        >
          <Image
            alt={slide.label || ""}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.01]"
            fill
            priority
            sizes="(min-width: 1470px) 1470px, 100vw"
            src={resolveAssetUrl(slide.image)}
          />
        </Link>
        {visible.length > 1 ? (
          <div className="mt-4 flex justify-center gap-3">
            {visible.map((item, index) => (
              <button
                aria-label={`Show ${item.label || `slide ${index + 1}`}`}
                aria-pressed={active === index}
                className={`h-2.5 w-2.5 rounded-full border transition ${
                  active === index
                    ? "border-[#acacac] bg-transparent"
                    : "border-[#918981] bg-[#918981]"
                }`}
                key={`${item.label}-${index}`}
                onClick={() => setActive(index)}
                type="button"
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
