import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminBadgeVariant = "pub" | "draft" | "scheduled" | "oos" | "neutral";

export type AdminBadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: AdminBadgeVariant };

export function AdminBadge({ variant = "neutral", className, ...rest }: AdminBadgeProps) {
  return <span data-variant={variant} className={cn("admin-badge", className)} {...rest} />;
}
