import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "./cn";

export type AdminInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: "md" | "lg" };

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(function AdminInput(
  { className, size = "md", ...rest },
  ref,
) {
  return <input ref={ref} className={cn("admin-input", size === "lg" && "lg", className)} {...rest} />;
});
