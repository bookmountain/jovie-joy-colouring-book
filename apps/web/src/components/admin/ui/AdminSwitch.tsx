import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminSwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onChange?: (next: boolean) => void;
};

export function AdminSwitch({ checked, onChange, className, disabled, ...rest }: AdminSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "on" : "off"}
      disabled={disabled}
      className={cn("admin-switch", className)}
      onClick={() => onChange?.(!checked)}
      {...rest}
    >
      <span className="knob" />
    </button>
  );
}
