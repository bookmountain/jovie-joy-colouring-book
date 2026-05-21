import { OrdersTable } from "@/components/admin/OrdersTable";
import { AdminPageHeader } from "@/components/admin/ui";

export default function AdminOrdersPage() {
  return (
    <div>
      <AdminPageHeader title="Orders" />
      <div className="mt-6">
        <OrdersTable />
      </div>
    </div>
  );
}
