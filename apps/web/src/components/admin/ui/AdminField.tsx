import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export function AdminField({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("admin-field", className)} {...rest} />;
}
