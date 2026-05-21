import { AnalyticsCards } from "@/components/admin/AnalyticsCards";
import { AdminPageHeader } from "@/components/admin/ui";

export default function AdminDashboard() {
  return (
    <div>
      <AdminPageHeader title="Dashboard" />
      <div className="mt-6">
        <AnalyticsCards />
      </div>
    </div>
  );
}
