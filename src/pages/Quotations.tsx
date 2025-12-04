import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Plus, Eye, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { InvoiceTemplate } from "@/components/InvoiceTemplate";
import { formatLocalDate } from "@/lib/dateUtils";
import { QuotationProductSelector } from "@/components/QuotationProductSelector";
import { SearchFilter } from "@/components/SearchFilter";
import { Switch } from "@/components/ui/switch";
import { calculateLineItemAmounts } from "@/lib/gstCalculator";
import { AdvancedFilters } from "@/components/AdvancedFilters";



// ----------------------
// AUTO NUMBER GENERATORS
// ----------------------
const getTodayCode = () => {
  const d = new Date();
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
};

const generateQuotationNumber = async () => {
  const today = getTodayCode();

  const { data } = await supabase
    .from("quotations")
    .select("id, quotation_number")
    .like("quotation_number", `QUO-${today}%`);

  const count = data?.length || 0;
  const nextSeq = (count + 1).toString().padStart(2, "0");

  return `QUO-${today}${nextSeq}`;
};



type BillingType = "inclusive_gst" | "exclusive_gst";

const normalizeBillingType = (value: string | null | undefined): BillingType => {
  if (value === "exclusive_gst") return "exclusive_gst";
  return "inclusive_gst";
};



interface Quotation {
  id: string;
  quotation_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  valid_until: string | null;
  customer_id: string | null;
  deal_id?: string | null;
  tax_amount: number;
  discount_amount: number;
  notes: string | null;
  cgst_percent: number;
  sgst_percent: number;
  subtotal?: number;
  billing_type?: "inclusive_gst" | "exclusive_gst";
show_gst_split?: boolean;
  related_sales_order_id?: string | null;
  related_sales_order_number?: string | null;
}

const Quotations = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    quotation_number: "",
    customer_id: "",
    deal_id: "",
    status: "draft",
    valid_until: "",
    cgst_percent: "9",
    sgst_percent: "9",
    discount_amount: "0",
    notes: "",
  });
  const [lineItems, setLineItems] = useState([
    { type: "new", product_id: "", description: "", quantity: 1, unit_price: 0, cgst_percent: 9, sgst_percent: 9 }
  ]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchQuotations();
    fetchCustomers();
    fetchDeals();
    fetchProducts();
  }, []);

  useEffect(() => {
  if (createOpen && !formData.quotation_number) {
    generateQuotationNumber().then((num) =>
      setFormData((f) => ({ ...f, quotation_number: num }))
    );
  }
}, [createOpen]);


  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("customers")
        .select("id, name, gst_number, cin_number")
        .eq("user_id", user.id);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchDeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("deals")
        .select("id, title")
        .eq("user_id", user.id);

      if (error) throw error;
      setDeals(data || []);
    } catch (error: any) {
      console.error("Error fetching deals:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, unit_price")
        .eq("user_id", user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchQuotations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
  .from("quotations")
  .select("*")

        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related sales orders for accepted quotations
      const quotationsWithOrders = await Promise.all(
        (data || []).map(async (quotation) => {
          if (quotation.status === "accepted") {
            const { data: salesOrder } = await supabase
              .from("sales_orders")
              .select("id, order_number")
              .eq("quotation_id", quotation.id)
              .single();
            
            return {
              ...quotation,
              related_sales_order_id: salesOrder?.id || null,
              related_sales_order_number: salesOrder?.order_number || null,
            };
          }
          return quotation;
        })
      );

      setQuotations(quotationsWithOrders);
    } catch (error: any) {
      toast.error("Error fetching quotations");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch company settings for billing rules
    const { data: settings } = await supabase
      .from("company_settings")
      .select("billing_type, show_gst_split")
      .eq("user_id", user.id)
      .single();

    const billingType = settings?.billing_type || "inclusive_gst";
    //const showSplit = settings?.show_gst_split !== false;
    const showSplit = settings?.show_gst_split ?? false;

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalAmount = 0;

    // Process each line item using GST Engine
    const processedItems = lineItems.map(item => {
      const totalRate = (item.cgst_percent || 0) + (item.sgst_percent || 0);

      const gst = calculateLineItemAmounts(
  Number(item.unit_price),
  Number(item.quantity),
  totalRate,
  normalizeBillingType(billingType)
);


      subtotal += gst.taxableValue;
      totalCgst += gst.cgstAmount;
      totalSgst += gst.sgstAmount;
      totalAmount += gst.totalAmount;

      return {
        description: item.description,
        product_id: item.product_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        taxable_value: gst.taxableValue,
        cgst_amount: gst.cgstAmount,
        sgst_amount: gst.sgstAmount,
        amount: gst.totalAmount,
      };
    });

    const taxAmount = totalCgst + totalSgst;
    const discount = Number(formData.discount_amount) || 0;
    const grandTotal = totalAmount - discount;

    const selectedCustomer = customers.find(c => c.id === formData.customer_id);

    // Insert quotation
    const { data: quotation, error } = await supabase
  .from("quotations")
  .insert({
    quotation_number: await generateQuotationNumber(),
    customer_id: formData.customer_id || null,
    deal_id: formData.deal_id || null,
    status: formData.status as any,       // FIX 1
    valid_until: formData.valid_until || null,

    billing_type: billingType,
    show_gst_split: showSplit,

    customer_gst_number: selectedCustomer?.gst_number || null,
customer_cin_number: selectedCustomer?.cin_number || null,

    cgst_percent: lineItems[0].cgst_percent,
    sgst_percent: lineItems[0].sgst_percent,

    subtotal,
    tax_amount: taxAmount,
    discount_amount: discount,
    total_amount: grandTotal,
    notes: formData.notes,
    user_id: user.id,
  } as any)                                // FIX 2
  .select()
  .single();

    if (error) throw error;

    // Insert quotation items
    await supabase.from("quotation_items").insert(
      processedItems.map(item => ({
        quotation_id: quotation.id,
        ...item,
      }))
    );

    toast.success("Quotation created successfully!");
    setCreateOpen(false);

    // Reset
    setFormData({
      quotation_number: "",
      customer_id: "",
      deal_id: "",
      status: "draft",
      valid_until: "",
      cgst_percent: "9",
      sgst_percent: "9",
      discount_amount: "0",
      notes: "",
    });

    setLineItems([
      { type: "new", product_id: "", description: "", quantity: 1, unit_price: 0, cgst_percent: 9, sgst_percent: 9 }
    ]);

    fetchQuotations();

  } catch (error) {
    console.error(error);
    toast.error("Failed to create quotation");
  }
};


  const handleViewInvoice = async (quotation: Quotation) => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotation.id);

      if (itemsError) throw itemsError;

      let customerData = null;
      if (quotation.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("*")
          .eq("id", quotation.customer_id)
          .single();
        customerData = customer;
      }

      const invoiceData = {
        invoice_number: quotation.quotation_number,
        quotation_id: quotation.id,
        date: quotation.created_at,
        due_date: quotation.valid_until,
        customer_name: customerData?.name || "Customer Name",
        customer_email: customerData?.email,
        customer_phone: customerData?.phone,
        customer_gst_number: customerData?.gst_number || "",
customer_cin_number: customerData?.cin_number || "",
        customer_address: customerData?.address,
        customer_city: customerData?.city,
        customer_state: customerData?.state,
        customer_postal_code: customerData?.postal_code,
        items: items?.map(item => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          cgst_amount: Number(item.cgst_amount || 0),
          sgst_amount: Number(item.sgst_amount || 0),
          amount: Number(item.amount),
          product_id: (item as any).product_id || null,
        })) || [],
        //subtotal: Number(quotation.total_amount) - Number(quotation.tax_amount) + Number(quotation.discount_amount),
        subtotal: Number(quotation.subtotal || 0),
        tax_amount: Number(quotation.tax_amount),
        discount_amount: Number(quotation.discount_amount),
        total_amount: Number(quotation.total_amount),
        notes: quotation.notes,
        cgst_percent: Number(quotation.cgst_percent || 0),
        sgst_percent: Number(quotation.sgst_percent || 0),
        status: quotation.status,
        billing_type: quotation.billing_type,
show_gst_split: quotation.show_gst_split,

      };

      setSelectedQuotation(invoiceData);
      setInvoiceDialogOpen(true);
    } catch (error) {
      toast.error("Error loading quotation details");
    }
  };

  const handleStatusChange = async (quotationId: string, newStatus: string, oldStatus?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch quotation details before update for activity logging
      const { data: quotationBeforeUpdate } = await supabase
        .from("quotations")
        .select("quotation_number")
        .eq("id", quotationId)
        .single();

      // Update quotation status
      const { error } = await supabase
        .from("quotations")
        .update({ status: newStatus as any })
        .eq("id", quotationId);

      if (error) throw error;

      // Log activity for status change
      await supabase.from("activities").insert({
        user_id: user.id,
        activity_type: "status_change",
        subject: `Quotation ${quotationBeforeUpdate?.quotation_number || quotationId} status changed`,
        description: `Quotation status changed from ${oldStatus || "unknown"} to ${newStatus}`,
        related_to_type: "quotation",
        related_to_id: quotationId,
      } as any);

      // If status changed to "accepted", create a sales order
      if (newStatus === "accepted" && oldStatus !== "accepted") {
        // Check if sales order already exists for this quotation
        const { data: existingOrder } = await supabase
          .from("sales_orders")
          .select("id")
          .eq("quotation_id", quotationId)
          .single();

        if (!existingOrder) {
          // Fetch quotation details
          const { data: quotation, error: quoteError } = await supabase
            .from("quotations")
            .select("*")
            .eq("id", quotationId)
            .single<Quotation>();

          if (quoteError) throw quoteError;

          // Fetch quotation items
          const { data: quotationItems, error: itemsError } = await supabase
            .from("quotation_items")
            .select("*")
            .eq("quotation_id", quotationId);

          if (itemsError) throw itemsError;

          // Generate order number
          const orderNumber = `SO-${Date.now()}`;

          // Calculate subtotal
          const subtotal = quotationItems?.reduce((sum, item) => 
            sum + (Number(item.quantity) * Number(item.unit_price)), 0) || 0;

          // Create sales order
          const { data: salesOrder, error: orderError } = await supabase
            .from("sales_orders")
            .insert({
              order_number: orderNumber,
              quotation_id: quotationId,
              customer_id: quotation.customer_id,
              deal_id: quotation.deal_id,
              order_date: new Date().toISOString().slice(0, 10),
              expected_delivery_date: quotation.valid_until || null,
              status: "draft",
              subtotal: subtotal,
              discount_amount: quotation.discount_amount || 0,
              tax_amount: quotation.tax_amount || 0,
              cgst_percent: quotation.cgst_percent || 9,
              sgst_percent: quotation.sgst_percent || 9,
              total_amount: quotation.total_amount || 0,
              notes: quotation.notes || `Created from quotation ${quotation.quotation_number}`,
              user_id: user.id,
              billing_type: quotation.billing_type,
              show_gst_split: quotation.show_gst_split,

            } as any)
            .select()
            .single();

          if (orderError) throw orderError;

          // Create sales order items from quotation items
          if (quotationItems && quotationItems.length > 0 && salesOrder) {
            const orderItems = quotationItems.map((item) => {
              const itemSubtotal = Number(item.quantity) * Number(item.unit_price);
              const itemData: any = {
                sales_order_id: salesOrder.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                amount: item.amount,
                cgst_amount: item.cgst_amount || 0,
                sgst_amount: item.sgst_amount || 0,
              };
              // Only include product_id if it exists (after migration makes it nullable)
              if ((item as any).product_id) {
                itemData.product_id = (item as any).product_id;
              }
              return itemData;
            });

            const { error: orderItemsError } = await supabase
              .from("sales_order_items")
              .insert(orderItems);

            if (orderItemsError) throw orderItemsError;
          }

          // Log activity for sales order creation
          await supabase.from("activities").insert({
            user_id: user.id,
            activity_type: "sales_order_created",
            subject: `Sales order ${orderNumber} created from quotation`,
            description: `Sales order ${orderNumber} was automatically created from quotation ${quotation.quotation_number}`,
            related_to_type: "sales_order",
            related_to_id: salesOrder.id,
          } as any);

          toast.success("Quotation accepted! Sales order created successfully.");
        } else {
          toast.success("Status updated successfully! (Sales order already exists for this quotation)");
        }
      } else {
        toast.success("Status updated successfully!");
      }

      fetchQuotations();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Error updating status");
    }
  };

  const filteredQuotations = quotations.filter(q => {
    // Advanced filters
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (customerFilter && q.customer_id !== customerFilter) return false;
    const matchesSearch = q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.status.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Quotations & Billing</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your quotes and invoices</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="text-xs md:text-sm">Create Quotation</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Quotation</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quotation_number">Quotation Number *</Label>
                <Input
                  id="quotation_number"
                  value={formData.quotation_number}
                  readOnly
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer</Label>
                  <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal_id">Deal</Label>
                  <Select value={formData.deal_id} onValueChange={(value) => setFormData({ ...formData, deal_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select deal" />
                    </SelectTrigger>
                    <SelectContent>
                      {deals.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Discount Amount (₹)</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                  />
                </div>
              </div>
              
              <QuotationProductSelector items={lineItems} onChange={setLineItems} />

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Quotation</Button>
              </div>
            </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
        <SearchFilter value={searchTerm} onChange={setSearchTerm} placeholder="Search quotations..." />
        <AdvancedFilters
          filters={[
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "draft", label: "Draft" },
                { value: "sent", label: "Sent" },
                { value: "accepted", label: "Accepted" },
                { value: "rejected", label: "Rejected" },
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
            status: statusFilter === "all" ? null : statusFilter,
            customer: customerFilter 
          }}
          onFilterChange={(key, value) => {
            if (key === "status") setStatusFilter(value || "all");
            if (key === "customer") setCustomerFilter(value);
          }}
          onClearAll={() => {
            setStatusFilter("all");
            setCustomerFilter(null);
          }}
        />
      </div>

      <div className="border rounded-lg overflow-x-auto -mx-2 md:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs md:text-sm">Quotation #</TableHead>
              <TableHead className="text-xs md:text-sm">Status</TableHead>
              <TableHead className="text-xs md:text-sm">Total Amount</TableHead>
              <TableHead className="text-xs md:text-sm hidden md:table-cell">Valid Until</TableHead>
              <TableHead className="text-xs md:text-sm hidden lg:table-cell">Created</TableHead>
              <TableHead className="text-xs md:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                    <p>No quotations found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotations.map((quotation) => (
                <TableRow key={quotation.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-xs md:text-sm">
                    <div className="flex flex-col">
                      <span>{quotation.quotation_number}</span>
                      <span className="md:hidden text-xs text-muted-foreground mt-1">
                        {formatLocalDate(quotation.created_at)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className="text-xs md:text-sm">
                    <Select 
                      value={quotation.status} 
                      onValueChange={(value: string) => handleStatusChange(quotation.id, value, quotation.status)}
                    >
                      <SelectTrigger className={`h-7 md:h-8 text-xs md:text-sm ${getStatusColor(quotation.status)}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm font-medium">₹{Number(quotation.total_amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">{quotation.valid_until ? formatLocalDate(quotation.valid_until) : "-"}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell">{formatLocalDate(quotation.created_at)}</TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 items-start sm:items-center">
                      {quotation.status === "accepted" && quotation.related_sales_order_number && (
                        <Link to="/dashboard/sales-orders" className="mb-1 sm:mb-0">
                          <Badge variant="outline" className="text-[10px] md:text-xs">
                            <ExternalLink className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                            SO: {quotation.related_sales_order_number}
                          </Badge>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInvoice(quotation)}
                        className="h-7 w-7 md:h-8 md:w-8 p-0"
                      >
                        <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </Button>
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
        invoiceData={selectedQuotation}
        type="quotation"
        onSave={async () => {
          await fetchQuotations();
        }}
      />
    </div>
  );
};

export default Quotations;