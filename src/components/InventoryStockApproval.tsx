import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PendingOrder {
  id: string;
  order_number: string;
  order_date: string;
  total_amount: number;
  items: Array<{
    description: string;
    quantity: number;
    product_id: string | null;
  }>;
}

export const InventoryStockApproval = () => {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  /* ===========================
     LOGIC — UNCHANGED
     =========================== */
  const fetchPendingOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: approvals, error } = await supabase
        .from("stock_approval")
        .select("id, sales_order_id, purchase_order_id, status")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      const salesOrderIds = [
        ...new Set(
          approvals?.filter(a => a.sales_order_id).map(a => a.sales_order_id) || []
        ),
      ];

      const purchaseOrderIds = [
        ...new Set(
          approvals?.filter(a => a.purchase_order_id).map(a => a.purchase_order_id) || []
        ),
      ];

      const allOrders: any[] = [];

      if (salesOrderIds.length > 0) {
        const { data: salesOrders } = await supabase
          .from("sales_orders")
          .select("id, order_number, order_date, total_amount")
          .in("id", salesOrderIds)
          .eq("user_id", user.id);

        const enriched = await Promise.all(
          (salesOrders || []).map(async (order) => {
            const { data: items } = await supabase
              .from("sales_order_items")
              .select("description, quantity, product_id")
              .eq("sales_order_id", order.id)
              .not("product_id", "is", null);

            return { ...order, items, order_type: "sales" };
          })
        );

        allOrders.push(...enriched);
      }

      if (purchaseOrderIds.length > 0) {
        const { data: purchaseOrders } = await supabase
          .from("purchase_orders")
          .select("id, po_number, order_date, total_amount")
          .in("id", purchaseOrderIds)
          .eq("user_id", user.id);

        const enriched = await Promise.all(
          (purchaseOrders || []).map(async (order) => {
            const { data: items } = await supabase
              .from("purchase_order_items")
              .select("description, quantity, product_id")
              .eq("purchase_order_id", order.id)
              .not("product_id", "is", null);

            return {
              ...order,
              order_number: order.po_number,
              items,
              order_type: "purchase",
            };
          })
        );

        allOrders.push(...enriched);
      }

      setPendingOrders(
        allOrders.sort(
          (a, b) =>
            new Date(b.order_date).getTime() -
            new Date(a.order_date).getTime()
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    if (actionLoading) return;
    setActionLoading(orderId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) return;

      const isPurchaseOrder = (order as any).order_type === "purchase";

      for (const item of order.items) {
        if (!item.product_id) continue;

        const { data: product } = await supabase
          .from("products")
          .select("quantity_in_stock")
          .eq("id", item.product_id)
          .single();

        const currentStock = product?.quantity_in_stock || 0;
        const newStock = isPurchaseOrder
          ? currentStock + item.quantity
          : Math.max(0, currentStock - item.quantity);

        await supabase
          .from("products")
          .update({ quantity_in_stock: newStock })
          .eq("id", item.product_id);
      }

      const approvalUpdate = {
        status: "approved",
        approved_at: new Date().toISOString(),
      };

      const query = isPurchaseOrder
        ? supabase.from("stock_approval").update(approvalUpdate).eq("purchase_order_id", orderId)
        : supabase.from("stock_approval").update(approvalUpdate).eq("sales_order_id", orderId);

      await query;

      if (!isPurchaseOrder) {
        await supabase
          .from("sales_orders")
          .update({ status: "shipped" })
          .eq("id", orderId);
      }

      toast.success("Approved successfully");
      fetchPendingOrders();
    } catch (e) {
      toast.error("Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (orderId: string) => {
    if (actionLoading) return;
    setActionLoading(orderId);

    try {
      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) return;

      const isPurchaseOrder = (order as any).order_type === "purchase";

      await supabase
        .from("stock_approval")
        .update({
          status: "rejected",
          approved_at: new Date().toISOString(),
        })
        .eq(
          isPurchaseOrder ? "purchase_order_id" : "sales_order_id",
          orderId
        );

      await supabase
        .from(isPurchaseOrder ? "purchase_orders" : "sales_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      toast.success("Order rejected");
      fetchPendingOrders();
    } catch {
      toast.error("Rejection failed");
    } finally {
      setActionLoading(null);
    }
  };

  /* ===========================
     UI — ZOHO STYLE
     =========================== */

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Inventory Stock Approval</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve stock-impacting orders
        </p>
      </div>

      <Card className="border border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-slate-600" />
            Pending Orders
            <Badge variant="destructive">{pendingOrders.length}</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[560px] divide-y">
            {pendingOrders.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No pending approvals
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="p-4 hover:bg-slate-50">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.order_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        ₹{order.total_amount.toLocaleString("en-IN")}
                      </p>
                      <Badge className="mt-1 bg-amber-100 text-amber-800">
                        Pending
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-sm">
                    {order.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between text-muted-foreground">
                        <span>{i.description}</span>
                        <span>Qty: {i.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={actionLoading === order.id}
                      onClick={() => handleApprove(order.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={actionLoading === order.id}
                      onClick={() => handleReject(order.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
