import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";

export default function CustomersPage() {
  return (
    <div>
      <AdminPageHeader crumb="Commerce" title="Customers" />
      <AdminEmptyState
        icon="👥"
        heading="Coming soon"
        body="Customer profiles, lifetime value, order history and wishlist insights arrive with the orders & customers spec."
      />
    </div>
  );
}
