import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

export default function NotifyMePage() {
  return (
    <div>
      <AdminPageHeader crumb="Commerce" title="Notify me" />
      <AdminEmptyState
        icon="🔔"
        heading="Coming soon"
        body="A list of customers who asked to be told when out-of-stock products return — wired up with the orders & customers spec."
      />
    </div>
  );
}
