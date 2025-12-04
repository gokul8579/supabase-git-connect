import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all pending stock approvals (both sales orders and purchase orders)
      const { data: approvals, error: approvalsError } = await supabase
        .from("stock_approval")
        .select("id, sales_order_id, purchase_order_id, product_id, quantity, status, approval_type")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (approvalsError) throw approvalsError;

      const salesOrderIds = [...new Set(approvals?.filter(a => a.sales_order_id).map(a => a.sales_order_id) || [])];
      const purchaseOrderIds = [...new Set(approvals?.filter(a => a.purchase_order_id).map(a => a.purchase_order_id) || [])];

      const allOrders: any[] = [];

      // Fetch sales orders (for stock decrease)
      if (salesOrderIds.length > 0) {
        const { data: salesOrders, error: salesError } = await supabase
          .from("sales_orders")
          .select(`
            id,
            order_number,
            order_date,
            total_amount,
            status
          `)
          .in("id", salesOrderIds)
          .eq("user_id", user.id);

        if (salesError) throw salesError;

        const salesOrdersWithItems = await Promise.all(
          (salesOrders || []).map(async (order) => {
            const { data: items } = await supabase
              .from("sales_order_items")
              .select("description, quantity, product_id")
              .eq("sales_order_id", order.id)
              .not("product_id", "is", null);

            return {
              ...order,
              items: (items || []).filter(item => item.product_id !== null),
              order_type: "sales",
            };
          })
        );
        allOrders.push(...salesOrdersWithItems);
      }

      // Fetch purchase orders (for stock increase)
      if (purchaseOrderIds.length > 0) {
        const { data: purchaseOrders, error: purchaseError } = await supabase
          .from("purchase_orders")
          .select(`
            id,
            po_number,
            order_date,
            total_amount,
            status
          `)
          .in("id", purchaseOrderIds)
          .eq("user_id", user.id);

        if (purchaseError) throw purchaseError;

        const purchaseOrdersWithItems = await Promise.all(
          (purchaseOrders || []).map(async (order) => {
            const { data: items } = await supabase
              .from("purchase_order_items")
              .select("description, quantity, product_id")
              .eq("purchase_order_id", order.id)
              .not("product_id", "is", null);

            return {
              ...order,
              order_number: order.po_number,
              items: (items || []).filter(item => item.product_id !== null),
              order_type: "purchase",
            };
          })
        );
        allOrders.push(...purchaseOrdersWithItems);
      }

      setPendingOrders(allOrders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()));
    } catch (error) {
      console.error("Error fetching pending orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) return;

      const isPurchaseOrder = (order as any).order_type === "purchase";

      // Update stock for each item
      for (const item of order.items) {
        if (!item.product_id) continue;

        const { data: product, error: fetchError } = await supabase
          .from("products")
          .select("quantity_in_stock")
          .eq("id", item.product_id)
          .single();

        if (fetchError) throw fetchError;

        // Increase stock for purchase orders, decrease for sales orders
        const currentStock = product.quantity_in_stock || 0;
        const newStock = isPurchaseOrder 
          ? currentStock + item.quantity
          : Math.max(0, currentStock - item.quantity);
        
        const { error: updateError } = await supabase
          .from("products")
          .update({ quantity_in_stock: newStock })
          .eq("id", item.product_id);

        if (updateError) throw updateError;
      }

      // Update stock approval status to approved
      const approvalUpdate: any = {
        status: "approved",
        approved_at: new Date().toISOString()
      };

      const approvalQuery = isPurchaseOrder
        ? supabase.from("stock_approval").update(approvalUpdate).eq("purchase_order_id", orderId).eq("status", "pending")
        : supabase.from("stock_approval").update(approvalUpdate).eq("sales_order_id", orderId).eq("status", "pending");

      const { error: approvalError } = await approvalQuery;

      if (approvalError) {
        console.error("Approval error:", approvalError);
        throw approvalError;
      }

      // Update order status
      if (isPurchaseOrder) {
        // Purchase orders don't need status change, they're already "received"
        toast.success("Purchase order approved! Stock increased successfully.");
      } else {
        // Update sales order status to shipped
        const { error } = await supabase
          .from("sales_orders")
          .update({ status: "shipped" })
          .eq("id", orderId);

        if (error) throw error;
        toast.success("Order approved, stock reduced, and marked as shipped!");
      }
      fetchPendingOrders();
    } catch (error) {
      console.error("Error approving order:", error);
      toast.error("Error approving order");
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const order = pendingOrders.find(o => o.id === orderId);
      if (!order) return;

      const isPurchaseOrder = (order as any).order_type === "purchase";

      // Update stock approval status to rejected
      const approvalUpdate: any = {
        status: "rejected",
        approved_at: new Date().toISOString()
      };

      const approvalQuery = isPurchaseOrder
        ? supabase.from("stock_approval").update(approvalUpdate).eq("purchase_order_id", orderId).eq("status", "pending")
        : supabase.from("stock_approval").update(approvalUpdate).eq("sales_order_id", orderId).eq("status", "pending");

      const { error: approvalError } = await approvalQuery;

      if (approvalError) {
        console.error("Rejection error:", approvalError);
        throw approvalError;
      }

      // Update order status
      if (isPurchaseOrder) {
        // Purchase orders can be cancelled
        const { error } = await supabase
          .from("purchase_orders")
          .update({ status: "cancelled" })
          .eq("id", orderId);

        if (error) throw error;
        toast.success("Purchase order rejected and cancelled");
      } else {
        // Update sales order status to cancelled
        const { error } = await supabase
          .from("sales_orders")
          .update({ status: "cancelled" })
          .eq("id", orderId);

        if (error) throw error;
        toast.success("Order rejected and cancelled");
      }

      fetchPendingOrders();
    } catch (error) {
      toast.error("Error rejecting order");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Inventory Stock Approval</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Stock Approval</h1>
        <p className="text-muted-foreground">Approve orders to reduce inventory stock</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pending Orders for Stock Approval
            {pendingOrders.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingOrders.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium">No pending orders for approval</p>
                <p className="text-sm mt-2">Orders with "confirmed" status will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-lg">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.order_date).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-medium text-primary mt-2">
                          ₹{order.total_amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        Pending Approval
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Products:</p>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground pl-3 border-l-2">
                          • {item.description} (Qty: {item.quantity})
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(order.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve & Ship
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleReject(order.id)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
    </div>
  );
};
