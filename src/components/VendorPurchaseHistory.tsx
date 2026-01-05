import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Calendar, DollarSign, FileText } from "lucide-react";

interface PurchaseOrder {
  id: string;
  po_number: string;
  order_date: string | null;
  status: string | null;
  payment_status: string;
  total_amount: number | null;
}

interface VendorPurchaseHistoryProps {
  vendorId: string;
}

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "completed":
    case "delivered":
      return "bg-success/10 text-success border-success/20";
    case "pending":
      return "bg-warning/10 text-warning border-warning/20";
    case "cancelled":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-success/10 text-success border-success/20";
    case "partial":
      return "bg-warning/10 text-warning border-warning/20";
    case "unpaid":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const VendorPurchaseHistory = ({ vendorId }: VendorPurchaseHistoryProps) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("purchase_orders")
          .select("id, po_number, order_date, status, payment_status, total_amount")
          .eq("vendor_id", vendorId)
          .order("order_date", { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error("Error fetching purchase history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (vendorId) {
      fetchPurchaseHistory();
    }
  }, [vendorId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground font-medium">No purchase history</p>
        <p className="text-sm text-muted-foreground/70">
          Purchase orders with this vendor will appear here
        </p>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="rounded-lg border bg-gradient-to-r from-primary/5 to-primary/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Purchase Orders</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold text-primary">
              ₹{totalSpent.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{order.po_number}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {order.order_date
                        ? new Date(order.order_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <DollarSign className="h-4 w-4" />
                  ₹{(order.total_amount || 0).toLocaleString("en-IN")}
                </div>
                <div className="flex gap-1 mt-2 justify-end">
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status || "N/A"}
                  </Badge>
                  <Badge variant="outline" className={getPaymentStatusColor(order.payment_status)}>
                    {order.payment_status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};