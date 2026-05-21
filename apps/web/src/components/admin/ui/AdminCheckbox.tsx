import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminCheckboxProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onChange?: (next: boolean) => void;
};

export function AdminCheckbox({ checked, onChange, className, disabled, ...rest }: AdminCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "on" : "off"}
      disabled={disabled}
      className={cn("admin-checkbox", className)}
      onClick={() => onChange?.(!checked)}
      {...rest}
    >
      <span className="check">✓</span>
    </button>
  );
}
