import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Package, Clock } from "lucide-react";

export const AlertsWidget = () => {
  const [lowStock, setLowStock] = useState(0);
  const [pendingDelivery, setPendingDelivery] = useState(0);
  const [overduePayments, setOverduePayments] = useState(0);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    // LOW STOCK
    const { count: low } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .lte("quantity_in_stock", 5);

    setLowStock(low || 0);

    // PENDING DELIVERY = shipped but not delivered
    const { count: pending } = await supabase
      .from("sales_orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed", "shipped"]);

    setPendingDelivery(pending || 0);

    // OVERDUE PAYMENTS
    const today = new Date().toISOString().split("T")[0];

    const { count: overdue } = await supabase
      .from("sales_orders")
      .select("*", { count: "exact", head: true })
      .lt("order_date", today)
      .neq("payment_status", "paid");

    setOverduePayments(overdue || 0);
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <h3 className="text-lg font-semibold">Alerts</h3>

      <div className="flex items-center gap-2">
        <AlertTriangle className="text-red-600 h-5 w-5" />
        <span>Low Stock:</span> <b>{lowStock}</b>
      </div>

      <div className="flex items-center gap-2">
        <Package className="text-yellow-600 h-5 w-5" />
        <span>Pending Deliveries:</span> <b>{pendingDelivery}</b>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="text-blue-600 h-5 w-5" />
        <span>Overdue Payments:</span> <b>{overduePayments}</b>
      </div>
    </div>
  );
};
