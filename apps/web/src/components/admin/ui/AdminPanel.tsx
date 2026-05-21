import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type AdminPanelVariant = "default" | "danger" | "dashed";

export type AdminPanelProps = HTMLAttributes<HTMLDivElement> & {
  sectionTag?: ReactNode;
  hint?: ReactNode;
  variant?: AdminPanelVariant;
};

export function AdminPanel({ sectionTag, hint, variant = "default", className, children, ...rest }: AdminPanelProps) {
  return (
    <div data-variant={variant} className={cn("admin-panel", className)} {...rest}>
      {sectionTag ? <span className="section-tag">{sectionTag}</span> : null}
      {hint ? <p className="panel-hint">{hint}</p> : null}
      {children}
    </div>
  );
}
