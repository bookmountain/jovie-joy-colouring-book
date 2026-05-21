import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type AdminChipVariant = "default" | "tag" | "add";

export type AdminChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: AdminChipVariant;
  onDismiss?: () => void;
  children?: ReactNode;
};

export function AdminChip({ variant = "default", className, onDismiss, children, ...rest }: AdminChipProps) {
  if (variant === "add") {
    return (
      <button
        type="button"
        data-variant={variant}
        className={cn("admin-chip", className)}
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }

  return (
    <span data-variant={variant} className={cn("admin-chip", className)} {...rest}>
      {children}
      {onDismiss ? (
        <button
          type="button"
          className="x"
          aria-label={`remove ${typeof children === "string" ? children : "tag"}`}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
