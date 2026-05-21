"use client";

import Link from "next/link";
import { StaticPageHeaderEditor } from "@/components/admin/StaticPageHeaderEditor";
import { AdminPageHeader, AdminPanel } from "@/components/admin/ui";

export default function AdminFreebiesPage() {
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Freebies page"
        subtitle="The Freebies page shows products from the 'freebies' collection plus the intro copy below."
      />

      <StaticPageHeaderEditor slug="freebies" heading="Page header" hint="Title + intro shown above the product grid on /pages/freebies." />

      <AdminPanel className="space-y-2">
        <h2 className="text-lg font-bold">Products shown</h2>
        <p className="text-sm text-cocoa-text">
          The product grid is driven by the{" "}
          <Link className="text-cocoa-purple underline" href="/admin/collections/freebies">
            freebies collection
          </Link>{" "}
          — add or reorder zero-price products there.
        </p>
      </AdminPanel>
    </div>
  );
}
