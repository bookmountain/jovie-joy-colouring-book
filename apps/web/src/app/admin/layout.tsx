import type { Metadata } from "next";
import { AdminAuthProvider } from "@/state/admin-auth";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminToaster } from "@/components/admin/ui";
import "./admin.css";

export const metadata: Metadata = {
  title: "Zoe&Book Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminAuthGuard>
        <div className="admin-route-root">
          <AdminShell>{children}</AdminShell>
          <AdminToaster />
        </div>
      </AdminAuthGuard>
    </AdminAuthProvider>
  );
}
