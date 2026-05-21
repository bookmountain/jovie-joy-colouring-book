import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type AdminLabelProps = LabelHTMLAttributes<HTMLLabelElement> & { hint?: ReactNode };

export function AdminLabel({ className, children, hint, ...rest }: AdminLabelProps) {
  return (
    <label className={cn("admin-label", className)} {...rest}>
      {children}
      {hint ? <span className="hint">— {hint}</span> : null}
    </label>
  );
}
