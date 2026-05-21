import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type AdminFilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  count?: number;
  children: ReactNode;
};

export function AdminFilterChip({ active, count, className, children, type = "button", ...rest }: AdminFilterChipProps) {
  return (
    <button type={type} data-state={active ? "on" : "off"} className={cn("admin-filter-chip", className)} {...rest}>
      {children}
      {typeof count === "number" && count > 0 ? <span className="count">{count}</span> : null}
    </button>
  );
}
