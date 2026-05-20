import { OrdersTable } from "@/components/admin/OrdersTable";

export default function AdminOrdersPage() {
  return (
    <div>
      <h1 className="coco-heading mb-6">Orders</h1>
      <OrdersTable />
    </div>
  );
}
