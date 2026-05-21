import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";

export const AdminSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function AdminSelect({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn("admin-select", className)} {...rest}>
        {children}
      </select>
    );
  },
);
