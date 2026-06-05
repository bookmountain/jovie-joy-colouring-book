import { toast } from "sonner";

/** Success toast for a completed save/create. `label` is the noun, e.g. "Category". */
export function notifySaved(label = "Changes"): void {
  toast.success(`${label} saved`);
}

/** Success toast for a delete. */
export function notifyDeleted(label = "Item"): void {
  toast.success(`${label} deleted`);
}

/** Error toast — accepts an Error, a string, or anything. */
export function notifyError(e: unknown): void {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "Something went wrong";
  toast.error(msg);
}
