import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

export default function SubscribersPage() {
  return (
    <div>
      <AdminPageHeader crumb="Commerce" title="Subscribers" />
      <AdminEmptyState
        icon="✉️"
        heading="Coming soon"
        body="Newsletter subscriber list with export — shipped with the orders & customers spec."
      />
    </div>
  );
}
