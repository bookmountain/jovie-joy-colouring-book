"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { NavLink } from "@/data/navigation";

type MegaMenuProps = {
  active: boolean;
  item: NavLink;
  onClose: (options?: { immediate?: boolean }) => void;
  onOpen: () => void;
};

export function MegaMenu({ active, item, onClose, onOpen }: MegaMenuProps) {
  if (!item.children?.length) {
    return (
      <Link
        className="text-[18px] font-extrabold leading-7 text-cocoa-ink transition hover:text-cocoa-coral"
        href={item.href}
        onFocus={() => onClose({ immediate: true })}
        onMouseEnter={() => onClose({ immediate: true })}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onClose({ immediate: true });
        }
      }}
      onFocus={onOpen}
      onMouseEnter={onOpen}
      onMouseLeave={() => onClose()}
    >
      <button
        aria-expanded={active}
        aria-haspopup="menu"
        className={`flex items-center gap-1 text-[18px] font-extrabold leading-7 transition ${
          active ? "text-cocoa-coral" : "text-cocoa-ink hover:text-cocoa-coral"
        }`}
        onClick={onOpen}
        type="button"
      >
        {item.label}
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </button>
      <div
        className={`absolute left-0 top-full z-40 w-[22rem] translate-y-1 pt-3 opacity-0 transition duration-200 ${
          active
            ? "visible translate-y-0 opacity-100"
            : "invisible pointer-events-none"
        }`}
        role="menu"
      >
        <div className="grid bg-white py-[5px] pl-5 shadow-disclosure">
          {item.children.map((child) => (
            <div
              className="group/item relative border-b border-cocoa-line last:border-b-0"
              key={`${item.label}-${child.label}`}
            >
              <Link
                className="flex min-h-[46px] items-center justify-between pr-5 text-[16px] leading-7 text-cocoa-ink transition hover:text-cocoa-coral"
                href={child.href}
              >
                <span>{child.label}</span>
                {child.children?.length ? (
                  <ChevronRight aria-hidden="true" className="h-4 w-4 opacity-65" />
                ) : null}
              </Link>
              {child.children?.length ? (
                <div className="invisible absolute left-full top-[-5px] z-50 w-[22rem] bg-white py-[5px] pl-5 opacity-0 shadow-disclosure transition duration-200 group-hover/item:visible group-hover/item:opacity-100 group-focus-within/item:visible group-focus-within/item:opacity-100">
                  {child.children.map((grandchild) => (
                    <Link
                      aria-label={
                        grandchild.label.startsWith("Go to")
                          ? "Open parent collection"
                          : undefined
                      }
                      className="block min-h-[46px] border-b border-cocoa-line pr-5 text-[16px] leading-[46px] text-cocoa-ink transition last:border-b-0 hover:text-cocoa-coral"
                      href={grandchild.href}
                      key={grandchild.label}
                    >
                      {grandchild.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
