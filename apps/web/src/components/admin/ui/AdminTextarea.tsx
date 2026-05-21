import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

export const AdminTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AdminTextarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn("admin-textarea", className)} {...rest} />;
  },
);
