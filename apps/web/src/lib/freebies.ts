import { API_URL } from "@/lib/api";
import { adminFetch } from "@/lib/adminApi";

export type FreebieListItem = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  fileKind: "pdf" | "zip";
  fileSizeBytes: number;
  sortIndex: number;
};

export type Freebie = {
  slug: string;
  title: string;
  excerpt: string;
  description: string[];
  coverImage: string;
  fileKind: "pdf" | "zip";
  fileSizeBytes: number;
};

export type FreebieAdmin = Freebie & {
  id: string;
  filePath: string;
  sortIndex: number;
  published: boolean;
  requestCount: number;
  lastRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FreebieRequestRow = {
  id: string;
  email: string;
  optedIntoNewsletter: boolean;
  downloadCount: number;
  firstDownloadedAt: string | null;
  lastDownloadedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

export async function listFreebies(): Promise<FreebieListItem[]> {
  const res = await fetch(`${API_URL}/api/freebies`, { cache: "no-store" });
  if (!res.ok) throw new Error(`listFreebies ${res.status}`);
  return res.json();
}

export async function getFreebie(slug: string): Promise<Freebie> {
  const res = await fetch(`${API_URL}/api/freebies/${slug}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`getFreebie ${res.status}`);
  return res.json();
}

export async function requestFreebie(slug: string, email: string, optIn: boolean): Promise<void> {
  const res = await fetch(`${API_URL}/api/freebies/${slug}/request`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, optIn }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `requestFreebie ${res.status}`);
  }
}

export async function adminListFreebies(): Promise<FreebieAdmin[]> {
  return adminFetch("/api/admin/freebies");
}
export async function adminGetFreebie(slug: string): Promise<FreebieAdmin> {
  return adminFetch(`/api/admin/freebies/${slug}`);
}
export async function adminCreateFreebie(body: { slug: string; title: string; excerpt: string; description: string[]; published: boolean }): Promise<FreebieAdmin> {
  return adminFetch("/api/admin/freebies", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
export async function adminUpdateFreebie(slug: string, body: { title: string; excerpt: string; description: string[]; published: boolean }): Promise<FreebieAdmin> {
  return adminFetch(`/api/admin/freebies/${slug}`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
export async function adminDeleteFreebie(slug: string): Promise<void> {
  await adminFetch(`/api/admin/freebies/${slug}`, { method: "DELETE" });
}
export async function adminReorderFreebies(items: { slug: string; sortIndex: number }[]): Promise<void> {
  await adminFetch("/api/admin/freebies/reorder", {
    method: "POST",
    body: JSON.stringify(items),
    headers: { "content-type": "application/json" },
  });
}
export async function adminFreebieRequests(slug: string): Promise<FreebieRequestRow[]> {
  return adminFetch(`/api/admin/freebies/${slug}/requests`);
}
export async function adminResendFreebieRequest(slug: string, id: string): Promise<void> {
  await adminFetch(`/api/admin/freebies/${slug}/requests/${id}/resend`, { method: "POST" });
}
export async function adminUploadFreebieCover(slug: string, file: File): Promise<FreebieAdmin> {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<FreebieAdmin>(`/api/admin/freebies/${slug}/cover`, { method: "POST", body: fd });
}
export async function adminUploadFreebieFile(slug: string, file: File): Promise<FreebieAdmin> {
  const fd = new FormData(); fd.append("file", file);
  return adminFetch<FreebieAdmin>(`/api/admin/freebies/${slug}/file`, { method: "POST", body: fd });
}
