import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  STOREFRONT_CACHE_SCOPES,
  type StorefrontCacheScope,
} from "@/lib/api";

export const runtime = "nodejs";

const SECRET_HEADER = "x-cache-revalidation-secret";
const MAX_BODY_BYTES = 4_096;

type RevalidationPath = readonly [path: string, type: "layout" | "page"];

const PATHS_BY_SCOPE: Record<StorefrontCacheScope, readonly RevalidationPath[]> = {
  content: [["/", "layout"]],
  catalog: [
    ["/", "page"],
    ["/products", "page"],
    ["/products/[slug]", "page"],
    ["/collections", "page"],
    ["/collections/[slug]", "page"],
    ["/collections/[slug]/products/[productSlug]", "page"],
  ],
  blogs: [
    ["/", "page"],
    ["/blogs/[slug]", "page"],
    ["/blogs/[slug]/[articleSlug]", "page"],
  ],
  comics: [["/pages/comics", "page"]],
  about: [["/pages/about-us", "page"]],
  gallery: [
    ["/", "page"],
    ["/pages/gallery", "page"],
  ],
  pages: [["/pages/[slug]", "page"]],
  faqs: [
    ["/", "page"],
    ["/pages/faq", "page"],
    ["/pages/faqs", "page"],
  ],
  freebies: [["/pages/freebies", "page"]],
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function secretsMatch(received: string | null, expected: string): boolean {
  if (!received) return false;

  // Hash first so timingSafeEqual always compares equal-length byte arrays.
  const receivedHash = createHash("sha256").update(received).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedHash, expectedHash);
}

function isScope(value: unknown): value is StorefrontCacheScope {
  return typeof value === "string" &&
    (STOREFRONT_CACHE_SCOPES as readonly string[]).includes(value);
}

export async function POST(request: Request): Promise<Response> {
  const expectedSecret = process.env.CACHE_REVALIDATION_SECRET?.trim() ?? "";
  if (expectedSecret.length < 32) {
    return json({ error: "Cache revalidation is unavailable" }, 503);
  }

  if (!secretsMatch(request.headers.get(SECRET_HEADER), expectedSecret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Content-Type must be application/json" }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "Request body is too large" }, 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Request body is too large" }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("scopes" in body) ||
    !Array.isArray(body.scopes) ||
    body.scopes.length === 0 ||
    body.scopes.length > 32 ||
    !body.scopes.every(isScope)
  ) {
    return json({ error: "scopes must contain only supported cache scopes" }, 400);
  }

  const scopes = [...new Set(body.scopes)];
  const paths = new Map<string, RevalidationPath>();

  for (const scope of scopes) {
    revalidateTag(`storefront:${scope}`);
    for (const entry of PATHS_BY_SCOPE[scope]) {
      paths.set(`${entry[1]}:${entry[0]}`, entry);
    }
  }

  for (const [path, type] of paths.values()) {
    revalidatePath(path, type);
  }

  return json({ revalidated: true, scopes }, 200);
}
