"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const slides = [
  {
    href: "/collections/vinyl-sticker-packs",
    label: "Vinyl Sticker Packs",
    desktop:
      "https://cocowyo.com/cdn/shop/files/sticker-laucnhing-banner-DT.png?v=1777523750&width=2000",
    mobile:
      "https://cocowyo.com/cdn/shop/files/sticker-laucnhing-banner-MB.png?v=1777523749&width=750",
  },
  {
    href: "/products/comfy-corner-coloring-book",
    label: "Comfy Corner Coloring Book",
    desktop:
      "https://cocowyo.com/cdn/shop/files/Comfy-Corner-coloring-book-banner-desktop.png?v=1775562163&width=2000",
    mobile:
      "https://cocowyo.com/cdn/shop/files/comfy-corner-banner-mobile..png?v=1776313803&width=750",
  },
  {
    href: "/collections/spiral-bound",
    label: "Spiral-bound Coloring Books",
    desktop:
      "https://cocowyo.com/cdn/shop/files/spiral-bound-banner-desktop.png?v=1776307178&width=2000",
    mobile:
      "https://cocowyo.com/cdn/shop/files/spiral-bound-banner-mobile..png?v=1776313803&width=750",
  },
  {
    href: "https://www.facebook.com/",
    label: "Zoe&Book Coloring Community",
    desktop:
      "https://cocowyo.com/cdn/shop/files/Come-Join-Us-DESKTOP.png?v=1774414477&width=2000",
    mobile:
      "https://cocowyo.com/cdn/shop/files/community-banner-mobile..png?v=1776313802&width=750",
  },
  {
    href: "/pages/comics",
    label: "Free Coloring Pages",
    desktop:
      "https://cocowyo.com/cdn/shop/files/coco-wyo-free-coloring-pages.png?v=1751277856&width=1880",
    mobile:
      "https://cocowyo.com/cdn/shop/files/freebies-banner-mobile..png?v=1776313802&width=750",
  },
];

export function HomeHero() {
  const [active, setActive] = useState(0);
  const slide = slides[active];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((value) => (value + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="bg-white pb-7 pt-[15px]">
      <div className="mx-auto max-w-[1470px] px-4">
        <Link
          aria-label="Open featured Zoe&Book banner"
          className="group relative block aspect-[5/8] overflow-hidden rounded-coco-sm bg-cocoa-cream md:aspect-[2/1]"
          href={slide.href}
        >
          <Image
            alt={slide.label}
            className="hidden h-full w-full object-cover transition duration-500 group-hover:scale-[1.01] md:block"
            fill
            priority
            sizes="100vw"
            src={slide.desktop}
          />
          <Image
            alt={slide.label}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.01] md:hidden"
            fill
            priority
            sizes="100vw"
            src={slide.mobile}
          />
        </Link>
        <div className="mt-4 flex justify-center gap-3">
          {slides.map((item, index) => (
            <button
              aria-label={`Show ${item.label}`}
              aria-pressed={active === index}
              className={`h-2.5 w-2.5 rounded-full border transition ${
                active === index
                  ? "border-[#acacac] bg-transparent"
                  : "border-[#918981] bg-[#918981]"
              }`}
              key={item.label}
              onClick={() => setActive(index)}
              type="button"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
