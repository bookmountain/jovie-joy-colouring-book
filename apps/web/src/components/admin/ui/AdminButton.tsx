import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminButtonVariant = "primary" | "ghost" | "dark" | "danger";

export type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
  size?: "md" | "sm";
};

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(function AdminButton(
  { variant = "primary", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-variant={variant}
      data-size={size}
      className={cn("admin-btn", className)}
      {...rest}
    />
  );
});
