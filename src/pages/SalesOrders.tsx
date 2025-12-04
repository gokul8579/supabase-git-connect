import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingCart, Plus, Eye, Trash2, Calendar as CalendarIcon, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { InvoiceTemplate } from "@/components/InvoiceTemplate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SalesOrderProductSelector2 } from "@/components/SalesOrderProductSelector2";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchFilter } from "@/components/SearchFilter";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatLocalDate } from "@/lib/dateUtils";
import { formatIndianNumber } from "@/lib/formatUtils";
import { BillingType, calculateLineItemAmounts } from "@/lib/gstCalculator";

// ----------------------
// AUTO SALES ORDER NUMBER GENERATOR
// ----------------------
const getTodayCode = () => {
  const d = new Date();
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
};

const generateSalesOrderNumber = async () => {
  const today = getTodayCode();

  const { data } = await supabase
    .from("sales_orders")
    .select("id, order_number")
    .like("order_number", `SO-${today}%`);

  const count = data?.length || 0;
  const nextSeq = (count + 1).toString().padStart(2, "0");

  return `SO-${today}${nextSeq}`;
};


interface SalesOrder {
  id: string;
  order_number: string;

  // NEW FIELDS ADDED
  party_type: "customer" | "vendor";
  party_id: string | null;

  status: string;
  order_date: string;
  total_amount: number;
  expected_delivery_date: string | null;

  // OLD FIELD REMOVED — REMOVE customer_id
  // customer_id: string | null;

  tax_amount: number;
  discount_amount: number;
  notes: string | null;

  payment_status?: string;
  cgst_percent?: number;
  sgst_percent?: number;

  quotation_id?: string | null;
  related_quotation_number?: string | null;

  profit?: number;
  subtotal?: number;

  billing_type?: BillingType;
  show_gst_split?: boolean;
}


const SalesOrders = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    order_number: "",
    party_type: "customer",
    party_id: "",
    status: "draft",
    payment_status: "pending",
    order_date: new Date().toISOString().slice(0,10),
    delivery_date: "",
    cgst_percent: "9",
    sgst_percent: "9",
    tax_amount: "0",
    discount_amount: "0",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<any[]>([
  { type: "existing", product_id: "", description: "", quantity: 1, unit_price: 0, cgst_percent: 9, sgst_percent: 9 }
]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, []);


  useEffect(() => {
  if (createOpen && !formData.order_number) {
    generateSalesOrderNumber().then((num) =>
      setFormData((f) => ({ ...f, order_number: num }))
    );
  }
}, [createOpen]);


  const fetchOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sales_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related quotations and calculate profit
      const ordersWithQuotations = await Promise.all(
        (data || []).map(async (order: any) => {
          let relatedQuotationNumber = null;
          if (order.quotation_id) {
            const { data: quotation } = await supabase
              .from("quotations")
              .select("quotation_number")
              .eq("id", order.quotation_id)
              .single();
            relatedQuotationNumber = quotation?.quotation_number || null;
          }

          // Calculate profit for this order
          let profit = 0;
          const { data: orderItems } = await supabase
            .from("sales_order_items")
            .select("product_id, quantity, unit_price")
            .eq("sales_order_id", order.id)
            .not("product_id", "is", null);

          if (orderItems && orderItems.length > 0) {
            const productIds = [...new Set(orderItems.map((item: any) => item.product_id).filter(Boolean))];
            if (productIds.length > 0) {
              const { data: products } = await supabase
                .from("products")
                .select("id, cost_price")
                .in("id", productIds);

              const productCostMap = new Map(products?.map((p: any) => [p.id, Number(p.cost_price) || 0]) || []);
              
              profit = orderItems.reduce((sum: number, item: any) => {
                if (!item.product_id) return sum;
                const costPrice = productCostMap.get(item.product_id) || 0;
                const margin = (Number(item.unit_price) - costPrice) * Number(item.quantity);
                return sum + margin;
              }, 0);
            }
          }

          return {
  ...order,

  // ensure party fields always exist
  party_type: order.party_type ?? "customer",
  party_id: order.party_id ?? order.customer_id ?? null,

  related_quotation_number: relatedQuotationNumber,
  profit: profit,
};

        })
      );

      setOrders(ordersWithQuotations);
    } catch (error: any) {
      toast.error("Error fetching sales orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [cust, vend] = await Promise.all([
      supabase.from("customers")
        .select("id, name")
        .eq("user_id", user.id),

      supabase.from("vendors")
  .select("id, company, name")
  .eq("user_id", user.id)

    ]);

    setCustomers(cust.data || []);
    setVendors(vend.data || []);
  } catch (error) {
    console.error("Error fetching customers/vendors", error);
  }
};


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      confirmed: "bg-blue-100 text-blue-800",
      shipped: "bg-yellow-100 text-yellow-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      partially_paid: "bg-blue-100 text-blue-800",
      overdue: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const filteredOrders = orders.filter(order => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!order.order_number.toLowerCase().includes(searchLower) &&
          !order.status.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Date filter
    if (dateFilter && new Date(order.order_date).toDateString() !== dateFilter.toDateString()) {
      return false;
    }

    // Advanced filters
    if (statusFilter && order.status !== statusFilter) return false;
    if (paymentStatusFilter && (order.payment_status || "pending") !== paymentStatusFilter) return false;
    //if (customerFilter && order.customer_id !== customerFilter) return false;
    if (customerFilter && order.party_id !== customerFilter) return false;

    return true;
  });

  type BillingType = "inclusive_gst" | "exclusive_gst";

const normalizeBillingType = (value: string | null | undefined): BillingType => {
  if (value === "inclusive_gst" || value === "exclusive_gst") {
    return value;
  }
  return "inclusive_gst"; 
};


  const handleViewOrder = async (order: SalesOrder) => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from("sales_order_items")
        .select("*")
        .eq("sales_order_id", order.id);

      if (itemsError) throw itemsError;

      let partyData = null;

if (order.party_type === "customer") {
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("id", order.party_id)
    .single();
  partyData = data;
} else {
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", order.party_id)
    .single();
  partyData = data;
}


      const invoiceData = {
        invoice_number: order.order_number,
        sales_order_id: order.id,
        date: order.order_date,
        due_date: order.expected_delivery_date,
        customer_name: partyData?.company_name || partyData?.name || "Party Name",
        customer_email: partyData?.email,
        customer_phone: partyData?.phone,
        customer_address: partyData?.address,
        customer_city: partyData?.city,
        customer_state: partyData?.state,
        customer_postal_code: partyData?.postal_code,
        items: (items || []).map(item => ({
          product_id: item.product_id ?? null,
          description: item.description || "Service",
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          cgst_amount: Number(item.cgst_amount || 0),
          sgst_amount: Number(item.sgst_amount || 0),
          amount: Number(item.amount || 0),
        })),
        subtotal: Number(order.subtotal || 0) || (items || []).reduce((sum, item) => 
          sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0),
        tax_amount: Number(order.tax_amount || 0),
        discount_amount: Number(order.discount_amount || 0),
        total_amount: Number(order.total_amount || 0),
        notes: order.notes || "",
        cgst_percent: Number(order.cgst_percent || 9),
        sgst_percent: Number(order.sgst_percent || 9),
        billing_type: order.billing_type || "inclusive_gst",
        show_gst_split: order.show_gst_split ?? false,

        status: order.status,
      };

      setSelectedOrder(invoiceData);
      setInvoiceDialogOpen(true);
    } catch (error) {
      toast.error("Error loading order details");
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      // Delete order items first
      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .delete()
        .eq("sales_order_id", orderToDelete);

      if (itemsError) throw itemsError;

      // Delete the order
      const { error } = await supabase
        .from("sales_orders")
        .delete()
        .eq("id", orderToDelete);

      if (error) throw error;

      toast.success("Sales order deleted successfully");
      fetchOrders();
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      toast.error("Error deleting sales order");
    }
  };

  // Note: handleInvoiceSave is now handled directly in InvoiceTemplate component
  // This function is kept for backward compatibility but may not be used
  const handleInvoiceSave = async (updatedData: any) => {
    if (!selectedOrder?.sales_order_id) return;

    try {
      const { error } = await supabase
        .from("sales_orders")
        .update({
          total_amount: updatedData.total_amount,
          tax_amount: updatedData.tax_amount,
          discount_amount: updatedData.discount_amount,
          notes: updatedData.notes,
          cgst_percent: updatedData.cgst_percent,
          sgst_percent: updatedData.sgst_percent,
        })
        .eq("id", selectedOrder.sales_order_id);

      if (error) throw error;

      toast.success("Sales order updated successfully!");
      fetchOrders();
      setInvoiceDialogOpen(false);
    } catch (error) {
      toast.error("Error updating sales order");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sales Orders</h1>
          <p className="text-sm md:text-base text-muted-foreground">Track and manage customer orders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            <span className="text-xs md:text-sm">New Sales Order</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <SearchFilter value={searchTerm} onChange={setSearchTerm} placeholder="Search sales orders..." />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal text-sm">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? formatLocalDate(dateFilter) : "Filter by date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              initialFocus
            />
            {dateFilter && (
              <div className="p-2 border-t">
                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => setDateFilter(undefined)}
                >
                  Clear filter
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <AdvancedFilters
          filters={[
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "draft", label: "Draft" },
                { value: "confirmed", label: "Confirmed" },
                { value: "shipped", label: "Shipped" },
                { value: "delivered", label: "Delivered" },
                { value: "cancelled", label: "Cancelled" },
              ],
            },
            {
              key: "payment_status",
              label: "Payment Status",
              type: "select",
              options: [
                { value: "pending", label: "Pending" },
                { value: "paid", label: "Paid" },
                { value: "partially_paid", label: "Partially Paid" },
                { value: "overdue", label: "Overdue" },
              ],
            },
            {
              key: "customer",
              label: "Customer",
              type: "select",
              options: customers.map(c => ({ value: c.id, label: c.name })),
            },
          ]}
          appliedFilters={{ 
            status: statusFilter, 
            payment_status: paymentStatusFilter,
            customer: customerFilter 
          }}
          onFilterChange={(key, value) => {
            if (key === "status") setStatusFilter(value);
            if (key === "payment_status") setPaymentStatusFilter(value);
            if (key === "customer") setCustomerFilter(value);
          }}
          onClearAll={() => {
            setStatusFilter(null);
            setPaymentStatusFilter(null);
            setCustomerFilter(null);
          }}
        />
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Create New Sales Order</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              // Validate line items
              const validLineItems = lineItems.filter(item => 
                item.description && item.description.trim() !== "" && 
                item.quantity > 0 && 
                item.unit_price >= 0
              );

              if (validLineItems.length === 0) {
                toast.error("Please add at least one valid item with description, quantity, and price");
                return;
              }

              // ---------- GST & Totals Calculation (NEW ENGINE) ----------
let subtotal = 0;
let totalTaxableValue = 0;
let totalCgst = 0;
let totalSgst = 0;
let totalAmount = 0;

// Get billing settings
const { data: settings } = await supabase
  .from("company_settings")
  .select("billing_type, show_gst_split")
  .eq("user_id", user.id)
  .maybeSingle();

const billingType = normalizeBillingType(settings?.billing_type);

validLineItems.forEach(item => {
  const rate = (Number(item.cgst_percent) || 0) + (Number(item.sgst_percent) || 0);
  const unitPrice = Number(item.unit_price);
  const qty = Number(item.quantity);

  // use the same function from SalesOrderProductSelector2
  const gst = calculateLineItemAmounts(unitPrice, qty, rate, billingType);

  subtotal += gst.taxableValue;
  totalTaxableValue += gst.taxableValue;
  totalCgst += gst.cgstAmount;
  totalSgst += gst.sgstAmount;
  totalAmount += gst.totalAmount;
});

const discount = parseFloat(formData.discount_amount) || 0;

const grandTotal = totalAmount - discount;
const taxAmount = totalCgst + totalSgst;

// average percentages (for storing in order table)
const avgCgstPercent =
  totalTaxableValue > 0 ? (totalCgst / totalTaxableValue) * 100 : 0;

const avgSgstPercent =
  totalTaxableValue > 0 ? (totalSgst / totalTaxableValue) * 100 : 0;


              const { data: order, error } = await supabase.from("sales_orders").insert({
                order_number: formData.order_number || await generateSalesOrderNumber(),
             //   customer_id: formData.customer_id || null,
                party_type: formData.party_type,
                party_id: formData.party_id || null,
                status: formData.status as any,
                payment_status: formData.payment_status as any,
                order_date: formData.order_date,
                expected_delivery_date: formData.delivery_date || null,
                cgst_percent: avgCgstPercent,
                sgst_percent: avgSgstPercent,
                subtotal: subtotal,
                tax_amount: taxAmount,
                discount_amount: discount,
                total_amount: grandTotal,
                notes: formData.notes,
                billing_type: billingType,
                show_gst_split: settings?.show_gst_split ?? true,

                user_id: user.id,
              } as any).select().single();

              if (error) {
                if (error.code === '23505') {
                  toast.error("A sales order with this number already exists");
                } else if (error.code === '23503') {
                  toast.error("Invalid customer selected");
                } else {
                  toast.error("Failed to create sales order. Please check all fields.");
                }
                throw error;
              }

              if (order && validLineItems.length > 0) {
                const items = validLineItems.map(item => {
                  const rate = (Number(item.cgst_percent) || 0) + (Number(item.sgst_percent) || 0);
const gst = calculateLineItemAmounts(
  Number(item.unit_price),
  Number(item.quantity),
  rate,
  billingType
);
                  const itemData: any = {
  sales_order_id: order.id,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  taxable_value: gst.taxableValue,
  cgst_amount: gst.cgstAmount,
  sgst_amount: gst.sgstAmount,
  amount: gst.totalAmount,
};
                  // Only include product_id for existing products (not services)
                  if (item.type === "existing" && item.product_id) {
                    itemData.product_id = item.product_id;
                  }
                  return itemData;
                });
                
                const { error: itemsErr } = await supabase.from("sales_order_items").insert(items);
                if (itemsErr) throw itemsErr;

                // Create stock approval for confirmed orders (only for products, not services)
                if (formData.status === "confirmed") {
                  for (const item of validLineItems) {
                    if (item.type === "existing" && item.product_id) {
                      await supabase.from("stock_approval").insert({
                        sales_order_id: order.id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        status: "pending",
                        user_id: user.id,
                      } as any);
                    }
                  }
                }
              }

              toast.success("Sales order created successfully!");
              setCreateOpen(false);
              setFormData({
  order_number: "",
  party_type: "customer",
  party_id: "",
  status: "draft",
  payment_status: "pending",
  order_date: new Date().toISOString().slice(0,10),
  delivery_date: "",
  cgst_percent: "9",
  sgst_percent: "9",
  tax_amount: "0",
  discount_amount: "0",
  notes: "",
});
              setLineItems([{ type: "existing", product_id: "", description: "", quantity: 1, unit_price: 0, cgst_percent: 9, sgst_percent: 9 }]);
              fetchOrders();
            } catch (err: any) {
              console.error("Error creating sales order:", err);
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="order_number">Order Number *</Label>
              <Input id="order_number" value={formData.order_number} readOnly required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
  <Label>Party Type</Label>
  <Select value={formData.party_type} onValueChange={(v) => setFormData({ ...formData, party_type: v })}>
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="customer">Customer</SelectItem>
      <SelectItem value="vendor">Vendor</SelectItem>
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <Label>{formData.party_type === "vendor" ? "Select Vendor" : "Select Customer"}</Label>

  <Select
  value={formData.party_id}
  onValueChange={(v) => setFormData({ ...formData, party_id: v })}
>
  <SelectTrigger>
    <SelectValue placeholder={`Select ${formData.party_type}`} />
  </SelectTrigger>

  <SelectContent>
    {formData.party_type === "customer"
      ? [...customers]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))
      : [...vendors]
          .sort((a, b) =>
            (a.company || a.name).localeCompare(b.company || b.name)
          )
          .map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {v.company || v.name}
            </SelectItem>
          ))}
  </SelectContent>
</Select>

</div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(v) => setFormData({ ...formData, payment_status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_date">Order Date</Label>
                <Input id="order_date" type="date" value={formData.order_date} onChange={(e) => setFormData({ ...formData, order_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Delivery Date</Label>
                <Input id="delivery_date" type="date" value={formData.delivery_date} onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount_amount">Discount Amount (₹)</Label>
                <Input id="discount_amount" type="number" step="0.01" value={formData.discount_amount} onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })} />
              </div>
            </div>
            

            <SalesOrderProductSelector2 items={lineItems} onChange={setLineItems} />

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit">Create Order</Button>
            </div>
          </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="border rounded-lg overflow-x-auto -mx-2 md:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs md:text-sm">Order Number</TableHead>
              <TableHead className="text-xs md:text-sm">Status</TableHead>
              <TableHead className="text-xs md:text-sm hidden md:table-cell">Payment Status</TableHead>
              <TableHead className="text-xs md:text-sm hidden lg:table-cell">Order Date</TableHead>
              <TableHead className="text-xs md:text-sm hidden lg:table-cell">Expected Delivery</TableHead>
              <TableHead className="text-xs md:text-sm">Total Amount</TableHead>
              <TableHead className="text-xs md:text-sm hidden md:table-cell">Profit</TableHead>
              <TableHead className="text-xs md:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                    <p>No sales orders found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-xs md:text-sm">
  <div className="flex flex-col">
    <span>{order.order_number}</span>

    {order.quotation_id && (
  <Link to="/dashboard/quotations">
    <Badge 
      className="text-[10px] md:text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer"
      variant="outline"
    >
      QUO
    </Badge>
  </Link>
)}



    <span className="md:hidden text-xs text-muted-foreground mt-1">
      {formatLocalDate(order.order_date)} | {order.payment_status || "pending"}
    </span>
  </div>
</TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()} className="text-xs md:text-sm">
                    <Select 
                      value={order.status} 
                      onValueChange={async (value: string) => {
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;

                          const { error } = await supabase
                            .from("sales_orders")
                            .update({ status: value as any })
                            .eq("id", order.id);
                          if (error) throw error;

                          // Log activity for status change
                          await supabase.from("activities").insert({
                            user_id: user.id,
                            activity_type: "status_change",
                            subject: `Sales order ${order.order_number} status changed`,
                            description: `Sales order status changed from ${order.status} to ${value}`,
                            related_to_type: "sales_order",
                            related_to_id: order.id,
                          } as any);

                          // Create stock approval when status changes to confirmed
                          if (value === "confirmed" && order.status !== "confirmed") {
                            const { data: items } = await supabase
                              .from("sales_order_items")
                              .select("product_id, quantity")
                              .eq("sales_order_id", order.id);

                            if (items) {
                              for (const item of items) {
                                if (item.product_id) {
                                  await supabase.from("stock_approval").insert({
                                    sales_order_id: order.id,
                                    product_id: item.product_id,
                                    quantity: item.quantity,
                                    status: "pending",
                                    user_id: user.id,
                                  } as any);
                                }
                              }
                            }
                          }

                          toast.success("Status updated");
                          fetchOrders();
                        } catch (error) {
                          toast.error("Error updating status");
                        }
                      }}
                      disabled={order.status === "delivered"}
                    >
                      <SelectTrigger className={`h-8 ${getStatusColor(order.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="hidden md:table-cell text-xs md:text-sm">
                    <Select 
                      value={order.payment_status || "pending"} 
                      onValueChange={async (value: string) => {
                        try {
                          const { error } = await supabase
                            .from("sales_orders")
                            .update({ payment_status: value })
                            .eq("id", order.id);
                          if (error) throw error;
                          toast.success("Payment status updated");
                          fetchOrders();
                        } catch (error) {
                          toast.error("Error updating payment status");
                        }
                      }}
                    >
                      <SelectTrigger className={`h-8 ${getPaymentStatusColor(order.payment_status || "pending")}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partially_paid">Partially Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs md:text-sm">{formatLocalDate(order.order_date)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs md:text-sm">{order.expected_delivery_date ? formatLocalDate(order.expected_delivery_date) : "-"}</TableCell>
                  <TableCell className="text-xs md:text-sm font-medium">₹{formatIndianNumber(order.total_amount)}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">
                    <span className={order.profit && order.profit > 0 ? "text-green-600 font-medium" : order.profit && order.profit < 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                      ₹{formatIndianNumber(order.profit || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-start sm:items-center">
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                          className="h-7 w-7 md:h-8 md:w-8 p-0"
                        >
                          <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOrderToDelete(order.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-7 w-7 md:h-8 md:w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <InvoiceTemplate 
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        invoiceData={selectedOrder}
        type="invoice"
        onSave={async (updatedData) => {
          // Refresh orders list after save
          await fetchOrders();
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteOrder}
        title="Delete Sales Order"
        description="Are you sure you want to delete this sales order? This action cannot be undone."
      />
    </div>
  );
};

export default SalesOrders;
