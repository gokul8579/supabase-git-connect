import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, IndianRupee, FileText } from "lucide-react";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, pointerWithin, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DetailViewDialog, DetailField } from "@/components/DetailViewDialog";
import { SalesOrderProductSelector2 } from "@/components/SalesOrderProductSelector2";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;  
  discount_amount?: number | null;  
  expected_profit?: number | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  customer_id: string | null;
 
  deal_items?: any[];
  items?: any[];
}

interface DraggableDealProps {
  deal: Deal;
  onClick: () => void;
}

// --- LineItem used for dealItems state ---
interface DealLineItem {
  type: "existing" | "service";
  product_id: string | null;   // required, matches selector expectation
  description: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  cgst_percent: number;
  sgst_percent: number;
  available_stock?: number;
   _needsStockUpdate?: boolean;
}


// --- For typing joined rows returned from Supabase queries ---
interface DealItemJoin {
  id: string;
  quantity: number;
  deals?: { id: string; stage: string } | null;
}

interface SalesOrderJoin {
  id: string;
  quantity: number;
  sales_orders?: { id: string; status: string } | null;
}




const DraggableDeal = ({ deal, onClick }: DraggableDealProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const bgColor = 
    deal.stage === "closed_won" ? "bg-green-100 border-green-300" : 
    deal.stage === "closed_lost" ? "bg-red-100 border-red-300" : 
    "";

  // ✅ Calculate Grand Total
  const lineTotal = deal.deal_items
  ? deal.deal_items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
  : deal.value || 0;

const discount = Number(deal.discount_amount || 0);
const grandTotal = Math.max(0, lineTotal - discount);


  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`p-3 border rounded-lg hover:bg-accent cursor-move transition-colors ${bgColor}`}
    >
      <div className="font-medium text-sm">{deal.title}</div>

      <div className="text-sm text-muted-foreground">
        ₹{Number(grandTotal).toLocaleString()}
      </div>

      {deal.probability !== null && (
        <div className="text-xs text-muted-foreground">
          {deal.probability}% probability
        </div>
      )}
    </div>
  );
};


// Droppable column wrapper to allow dropping deals into any stage
const StageColumn = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { stageId: id } });
  return (
    <div data-stage-id={id} ref={setNodeRef} className={isOver ? "bg-accent/20 rounded-lg" : undefined}>
      {children}
    </div>
  );
};

const stages = [
  { value: "enquiry", label: "Enquiry", color: "bg-blue-100 text-blue-800" },
  { value: "proposal", label: "Proposal", color: "bg-yellow-100 text-yellow-800" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-100 text-orange-800" },
  { value: "closed_won", label: "Closed Won", color: "bg-green-100 text-green-800" },
  { value: "closed_lost", label: "Closed Lost", color: "bg-red-100 text-red-800" },
];

const Pipeline = () => {

// --- STOCK CHECK FUNCTION (typed) ---
const fetchAvailableStock = async (productId: string) => {
  // 1) fetch product quantity
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("quantity_in_stock")
    .eq("id", productId)
    .single();

  if (prodErr) {
    console.error("Error fetching product stock:", prodErr);
    return 0;
  }
  const actualStock = Number(product?.quantity_in_stock || 0);

  // 2) reserved in pipeline deals (joined via FK)
  const { data: reservedDealsRaw, error: rdErr } = await supabase
    .from("deal_items")
    .select(`
      id,
      quantity,
      deals:deals!deal_items_deal_id_fkey (
        id,
        stage
      )
    `)
    .eq("product_id", productId)
    .returns<DealItemJoin[]>(); // <-- helpful for TS

  if (rdErr) {
    console.error("Error fetching reserved deals:", rdErr);
  }

  const reservedPipeline =
    (reservedDealsRaw
      ?.filter((d) => d.deals && d.deals.stage !== "closed_won" && d.deals.stage !== "closed_lost")
      .reduce((sum, d) => sum + (d.quantity || 0), 0)) || 0;

  // 3) reserved in draft sales orders (joined via FK)
  const { data: reservedSORaw, error: rsErr } = await supabase
    .from("sales_order_items")
    .select(`
      id,
      quantity,
      sales_orders:sales_orders!sales_order_items_sales_order_id_fkey (
        id,
        status
      )
    `)
    .eq("product_id", productId)
    .returns<SalesOrderJoin[]>(); // <-- helpful for TS

  if (rsErr) {
    console.error("Error fetching reserved sales orders:", rsErr);
  }

  const reservedSOQty =
    (reservedSORaw
      ?.filter((s) => s.sales_orders && s.sales_orders.status === "draft")
      .reduce((sum, s) => sum + (s.quantity || 0), 0)) || 0;

  return actualStock - reservedPipeline - reservedSOQty;
};





  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    //stage: "enquiry",
  stage: "enquiry" as Database["public"]["Enums"]["deal_stage"],
    value: "",
    discount_amount: "",    
    probability: "50",
    expected_close_date: "",
    expected_profit: "",
    notes: "",
    lead_id: "",
    customer_id: "",
  });
  // Allow adding products inside a deal
const [dealItems, setDealItems] = useState<DealLineItem[]>([
  { 
    type: "existing",
    product_id: "",
    description: "",
    quantity: 1,
    unit_price: 0,
    cgst_percent: 0,
    sgst_percent: 0
  }
]);


useEffect(() => {
  const timer = setTimeout(async () => {
    let changed = false;

    const updated = await Promise.all(
      dealItems.map(async (item) => {
        if (item.type === "existing" && item.product_id && item._needsStockUpdate) {
          const available = await fetchAvailableStock(item.product_id);

          let quantity = item.quantity;
          if (quantity > available) {
            toast.error(`Only ${available} units available in stock.`);
            quantity = available; // auto-clamp
            changed = true;
          }

          return {
            ...item,
            available_stock: available,
            quantity,
            _needsStockUpdate: false,
          };
        }

        return item;
      })
    );

    if (changed) {
      setDealItems(updated);  // safely update AFTER user stops typing
    }
  }, 400);

  return () => clearTimeout(timer);
}, [dealItems]);





  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  useEffect(() => {
    fetchDeals();
    fetchLeadsAndCustomers();
  }, []);

  // Auto-calc deal value based on selected products
// Auto-calculate deal value + expected profit
// Auto-calc deal value + expected profit based on selected products
useEffect(() => {
  let totalValue = 0;
  let totalProfit = 0;

  dealItems.forEach((item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price || 0);
    const cost = Number(item.cost_price || 0);

    totalValue += qty * price;

    if (item.type === "existing") {
      totalProfit += qty * (price - cost);
    }
  });

  const discount = Number(formData.discount_amount || 0);

  setFormData(prev => ({
    ...prev,
    value: Math.max(0, totalValue - discount).toString(),       // ✅ APPLY DISCOUNT
    expected_profit: Math.max(0, totalProfit - discount).toString(), // ✅ APPLY DISCOUNT
  }));
}, [dealItems, formData.discount_amount]);






const handleDeleteDeal = async () => {
  if (!selectedDeal) return;

  if (selectedDeal.stage === "closed_won") {
    toast.error("Closed-Won deals cannot be deleted.");
    return;
  }

  try {
    await supabase.from("deal_items").delete().eq("deal_id", selectedDeal.id);
    await supabase.from("deals").delete().eq("id", selectedDeal.id);

    toast.success("Deal deleted successfully.");
    setDetailOpen(false);
    fetchDeals();
  } catch (err) {
    console.error(err);
    toast.error("Error deleting deal.");
  }
};





  const fetchLeadsAndCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [leadsData, customersData] = await Promise.all([
        supabase.from("leads").select("id, name").eq("user_id", user.id),
        supabase.from("customers").select("id, name").eq("user_id", user.id)
      ]);

      setLeads(leadsData.data || []);
      setCustomers(customersData.data || []);
    } catch (error) {
      console.error("Error fetching leads/customers:", error);
    }
  };

  const fetchDeals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("deals")
        .select("*, deal_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeals((data as unknown as Deal[]) || []);
    } catch (error: any) {
      toast.error("Error fetching deals");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // STOCK VALIDATION BEFORE CREATING DEAL
for (const item of dealItems) {
  if (item.type === "existing" && item.product_id) {
    const available = item.available_stock ?? await fetchAvailableStock(item.product_id);

    if (item.quantity > available) {
      toast.error(
        `Deal cannot be created. Product exceeds available stock (${available}).`
      );
      return;
    }
  }
}


      const { data: deal, error } = await supabase
  .from("deals")
  .insert([{
    title: formData.title,
    //stage: formData.stage,
    stage: formData.stage as Database["public"]["Enums"]["deal_stage"],
    value: formData.value ? parseFloat(formData.value) : null,
    discount_amount: formData.discount_amount
  ? parseFloat(formData.discount_amount)
  : 0,

    probability: parseInt(formData.probability),
    expected_close_date: formData.expected_close_date || null,
    expected_profit: formData.expected_profit ? parseFloat(formData.expected_profit) : null,
    notes: formData.notes,
    lead_id: formData.lead_id || null,
    customer_id: formData.customer_id || null,
    user_id: user.id,
  }])
  .select()
  .single();

if (error) throw error;

// ⬅️ ADD THIS BLOCK HERE
const { data: settings } = await supabase
  .from("company_settings")
  .select("billing_type")
  .eq("user_id", user.id)
  .maybeSingle();

const billingType = settings?.billing_type || "exclusive_gst";



      // Insert deal items into deal_items table
// Insert deal items into deal_items table
if (dealItems.length > 0) {
  const filteredItems = dealItems.filter(item =>
  (item.type === "existing" && item.product_id) ||
  (item.type === "service" && item.description?.trim() !== "")
);



  if (filteredItems.length > 0) {
  const itemsToInsert = filteredItems.map(item => {
    const quantity = Number(item.quantity);
    const unit_price = Number(item.unit_price);
    const cost_price = Number(item.cost_price || 0);

    const cgst = Number(item.cgst_percent || 0);
    const sgst = Number(item.sgst_percent || 0);
    const gstRate = cgst + sgst;

    const amount = unit_price * quantity;

let taxableValue = 0;
let totalTax = 0;
let totalAmount = 0;

if (billingType === "inclusive_gst") {
  taxableValue = (amount * 100) / (100 + gstRate);
  totalTax = amount - taxableValue;
  totalAmount = amount; // GST already included
} else {
  taxableValue = amount;
  totalTax = (amount * gstRate) / 100;
  totalAmount = taxableValue + totalTax;
}


    return {
      deal_id: deal.id,
      product_id: item.type === "existing" ? item.product_id : null,
      description: item.description,
      quantity,
      unit_price,
      cost_price,
      cgst_percent: cgst,
      sgst_percent: sgst,
      taxable_value: taxableValue,
      total_tax: totalTax,
      total_amount: totalAmount,
      user_id: user.id,
    };
  });

  const { error: itemsErr } = await supabase
    .from("deal_items")
    .insert(itemsToInsert);

  if (itemsErr) console.error(itemsErr);
}

}



      toast.success("Deal created successfully!");
      setOpen(false);
      setFormData({
  title: "",
  stage: "enquiry" as Database["public"]["Enums"]["deal_stage"],
  value: "",
  discount_amount: "",
  probability: "50",
  expected_close_date: "",
  expected_profit: "",
  notes: "",
  lead_id: "",
  customer_id: "",
});
      setDealItems([
  {
    type: "existing",
    product_id: "",
    description: "",
    quantity: 1,
    unit_price: 0,
    cgst_percent: 0,
    sgst_percent: 0,
  }
]);


      fetchDeals();
    } catch (error: any) {
      toast.error("Error creating deal");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDealId(null);

    if (!over) return;

    const dealId = active.id as string;
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

      if (deal.stage === "closed_won") {
    toast.error("Closed-Won deals cannot be moved.");
    return;
  }
    
    // Prefer container stage id from droppable data
    let newStage: string | null = (over.data?.current as any)?.stageId || null;
    if (!newStage) {
      const overId = over.id as string;
      if (stages.some((s) => s.value === overId)) {
        newStage = overId;
      } else {
        const overDeal = deals.find((d) => d.id === overId);
        if (overDeal) newStage = overDeal.stage;
      }
    }

    if (!newStage || deal.stage === newStage) return;

    const validStages = ["enquiry", "proposal", "negotiation", "closed_won", "closed_lost"];
    if (!validStages.includes(newStage)) return;

    try {
      const { error } = await supabase
        .from("deals")
        .update({ stage: newStage as Database["public"]["Enums"]["deal_stage"] })
        .eq("id", dealId);

        // ---------------------------------------------
// AUTO-REDUCE STOCK WHEN DEAL BECOMES CLOSED_WON
if (newStage === "closed_won" && deal.stage !== "closed_won") {
  try {
    const { data: dealItems } = await supabase
      .from("deal_items")
      .select("product_id, quantity")
      .eq("deal_id", dealId);

    if (dealItems && dealItems.length > 0) {
      for (const item of dealItems) {
        if (!item.product_id) continue;

        await (supabase as any).rpc("decrement_stock", {
  product_id: item.product_id,
  qty_to_reduce: item.quantity
});

      }
    }

    toast.success("Stock updated for closed won deal!");
  } catch (err) {
    console.error(err);
    toast.error("Stock update failed");
  }
}



      if (error) throw error;

      setDeals(prevDeals => prevDeals.map(d => d.id === dealId ? { ...d, stage: newStage as Database["public"]["Enums"]["deal_stage"] } : d));
      toast.success(`Deal moved to ${stages.find(s => s.value === newStage)?.label}!`);
    } catch (error: any) {
      toast.error("Error moving deal");
    }
  };

  const handleDealClick = async (deal: Deal) => {
  const latestDeal = deals.find(d => d.id === deal.id) || deal;

  // Fetch deal items
  const { data: items, error } = await supabase
  .from("deal_items")
  .select("*, products(name)")
  .eq("deal_id", deal.id);


  if (error) console.error("Error loading deal items:", error);

  setSelectedDeal({
  ...latestDeal,
  items: (items as any[]) || [],
});

setDealItems(
  (items as any[]).map(i => ({
    type: i.product_id ? "existing" : "service",
    product_id: i.product_id,
    description: i.description,
    quantity: i.quantity,
    unit_price: i.unit_price,
    cost_price: i.cost_price,
    cgst_percent: i.cgst_percent,
    sgst_percent: i.sgst_percent
  }))
);



  setDetailOpen(true);
};


 // const handleCreateQuotation = async (dealId: string) => {
 //   try {
 //     const { data: { user } } = await supabase.auth.getUser();
 //     if (!user) return;

 //     const deal = deals.find(d => d.id === dealId);
 //     if (!deal) return;

 //     const quotationNumber = `QUO-${Date.now()}`;
      
  //    const { error } = await supabase.from("quotations").insert({
  //      quotation_number: quotationNumber,
   //     deal_id: dealId,
   //     customer_id: deal.customer_id,
   //     status: "draft",
   //     total_amount: deal.value || 0,
  //      user_id: user.id,
 //     });

  //    if (error) throw error;

   //   toast.success("Quotation created successfully!");
   //   setDetailOpen(false);
 //   } catch (error: any) {
  //    toast.error("Error creating quotation");
  //  }
 // };

 const handleCreateQuotation = (dealId: string) => {
  const deal = deals.find(d => d.id === dealId);
  if (!deal) return;

  navigate("/dashboard/quotations", {
    state: {
      fromDeal: true,
      deal_id: deal.id,
      customer_id: deal.customer_id,
      value: deal.value,
      items: selectedDeal?.items || []  // includes products inside deal
    }
  });
};


  const handleDetailEdit = async (data: Record<string, any>) => {
  if (!selectedDeal) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    toast.error("User not authenticated");
    return;
  }


    try {
      const { error } = await supabase
        .from("deals")
        .update({
          title: data.title,
          stage: data.stage as Database["public"]["Enums"]["deal_stage"],
          value: data.value ? parseFloat(data.value) : null,
          discount_amount: data.discount_amount
  ? parseFloat(data.discount_amount)
  : 0,
          probability: data.probability ? parseInt(data.probability) : null,
          expected_close_date: data.expected_close_date || null,
          notes: data.notes,
        })
        .eq("id", selectedDeal.id);

      if (error) throw error;

      // --- Update Deal Items ---
try {
  // 1) delete old items
  await supabase.from("deal_items").delete().eq("deal_id", selectedDeal.id);

  // 2) insert updated items
  const itemsToInsert = dealItems.map(item => {
    const quantity = Number(item.quantity);
    const unit_price = Number(item.unit_price);
    const cost_price = Number(item.cost_price || 0);

    const cgst = Number(item.cgst_percent || 0);
    const sgst = Number(item.sgst_percent || 0);
    const gstRate = cgst + sgst;

    const amount = unit_price * quantity;
    const taxableValue = amount;
    const totalTax = (amount * gstRate) / 100;
    const totalAmount = taxableValue + totalTax;

    return {
      deal_id: selectedDeal.id,
      product_id: item.type === "existing" ? item.product_id : null,
      description: item.description,
      quantity,
      unit_price,
      cost_price,
      cgst_percent: cgst,
      sgst_percent: sgst,
      taxable_value: taxableValue,
      total_tax: totalTax,
      total_amount: totalAmount,
     // user_id: selectedDeal.customer_id,
     user_id: user.id,
    };
  });

  if (itemsToInsert.length > 0) {
    await supabase.from("deal_items").insert(itemsToInsert);
  }

} catch (err) {
  console.error("Error updating deal items:", err);
  toast.error("Some deal items could not be saved.");
}


      // Update local state immediately
      setDeals(prevDeals => prevDeals.map(d => 
  d.id === selectedDeal.id 
    ? {
        ...d,
        ...data,
        value: data.value ? parseFloat(data.value) : null,
        discount_amount: data.discount_amount
          ? parseFloat(data.discount_amount)
          : 0,
      }
    : d
));

      setSelectedDeal({ ...selectedDeal, ...data, value: data.value ? parseFloat(data.value) : null, discount_amount: data.discount_amount
    ? parseFloat(data.discount_amount)
    : 0,probability: data.probability ? parseInt(data.probability) : null });

      toast.success("Deal updated successfully!");
      setDetailOpen(false);
    } catch (error: any) {
      toast.error("Error updating deal");
    }
  };

  const dealsByStage = stages.map((stage) => ({
    ...stage,
    deals: deals.filter((deal) => deal.stage === stage.value),
    totalValue: deals
  .filter((deal) => deal.stage === stage.value)
  .reduce((sum, deal) => {
    const lineTotal = deal.deal_items
      ? deal.deal_items.reduce(
          (s: number, item: any) => s + Number(item.total_amount || 0),
          0
        )
      : Number(deal.value) || 0;

    //return sum + lineTotal;
    const discount = Number(deal.discount_amount || 0);
return sum + Math.max(0, lineTotal - discount);

  }, 0),

  }));

  const activeDeal = activeDealId ? deals.find(d => d.id === activeDealId) : null;

  const detailFields: DetailField[] = selectedDeal ? [
    { label: "Title", value: selectedDeal.title, type: "text", fieldName: "title" },
    {
  label: "Stage",
  value: selectedDeal.stage as Database["public"]["Enums"]["deal_stage"],
  type: "select",
  fieldName: "stage",
  disabled: selectedDeal.stage === "closed_won",
      selectOptions: stages.map(s => ({
  value: s.value as Database["public"]["Enums"]["deal_stage"],
  label: s.label
}))

    },
    { label: "Value (₹)", value: selectedDeal.value?.toString() || "", type: "number", fieldName: "value" },
    {
  label: "Discount (₹)",
  value: selectedDeal.discount_amount?.toString() || "0",
  type: "number",
  fieldName: "discount_amount",
},

    { label: "Expected Profit (₹)", value: selectedDeal.expected_profit?.toString() || "0", type: "number", fieldName: "expected_profit" },
    { label: "Probability (%)", value: selectedDeal.probability?.toString() || "", type: "number", fieldName: "probability" },
    { label: "Expected Close Date", value: selectedDeal.expected_close_date || "", type: "date", fieldName: "expected_close_date" },
   

    // --- DEAL ITEMS (READ-ONLY DISPLAY) ---
// --- DEAL ITEMS FIRST ---
{
  label: "Deal Items",
  type: "custom",
  //fieldName: "items",
  value:
    selectedDeal.items && selectedDeal.items.length > 0
      ? selectedDeal.items.map((item: any) => ({
          name: item.products?.name ?? item.description,
          qty: item.quantity,
          price: item.unit_price,
          total: item.total_amount,
          cgst_percent: item.cgst_percent,
          sgst_percent: item.sgst_percent,
          taxable_value: item.taxable_value,
          total_tax: item.total_tax,
        }))
      : [],
},




// NOW put Notes BELOW the bill summary
{
  label: "Notes",
  value: selectedDeal.notes || "",
  type: "textarea",
  fieldName: "notes",
},


  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">Track your deals through each stage</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lead_id">Related Lead (Optional)</Label>
                  <Select value={formData.lead_id || "none"} onValueChange={(value) => setFormData({ ...formData, lead_id: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lead" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Related Customer (Optional)</Label>
                  <Select value={formData.customer_id || "none"} onValueChange={(value) => setFormData({ ...formData, customer_id: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={formData.stage} onValueChange={(value) =>
  setFormData({
    ...formData,
    stage: value as Database["public"]["Enums"]["deal_stage"]
  })
}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Deal Value (₹)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
  <Label htmlFor="discount_amount">Discount (₹)</Label>
  <Input
    id="discount_amount"
    type="number"
    step="0.01"
    value={formData.discount_amount}
    onChange={(e) =>
      setFormData({ ...formData, discount_amount: e.target.value })
    }
  />
</div>

                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_close_date">Expected Close Date</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_profit">Expected Profit (₹)</Label>
                  <Input
                    id="expected_profit"
                    type="number"
                    step="0.01"
                    value={formData.expected_profit}
                    onChange={(e) => setFormData({ ...formData, expected_profit: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {/* Product Selection */}
<Label>Products / Services</Label>
<SalesOrderProductSelector2
  items={dealItems}
  onChange={async (updatedItems) => {
    // Map to a new array — don't mutate directly
    const newItems: DealLineItem[] = [];

    for (const itm of updatedItems) {
  let cgst = itm.cgst_percent ?? 0;
  let sgst = itm.sgst_percent ?? 0;

  // ✅ AUTO-FETCH GST FROM PRODUCT MASTER
if (itm.product_id) {
  const { data: product } = await supabase
    .from("products")
    .select("gst_rate")
    .eq("id", itm.product_id)
    .single();

  const gstRate = Number(product?.gst_rate || 0);
  cgst = gstRate / 2;
  sgst = gstRate / 2;
}


  const item: DealLineItem = {
    ...itm,
    description: itm.description ?? "",
    cgst_percent: cgst,
    sgst_percent: sgst,
    _needsStockUpdate: true,
  };

  newItems.push(item);
}


    setDealItems(newItems);
  }}
/>


                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Deal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {dealsByStage.map((stage) => (
            <SortableContext key={stage.value} items={stage.deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
              <StageColumn id={stage.value}>
                <Card className="flex flex-col" id={stage.value}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <Badge className={stage.color} variant="outline">
                        {stage.label}
                      </Badge>
                      <span className="text-sm font-normal text-muted-foreground">
                        {stage.deals.length}
                      </span>
                    </CardTitle>
                    <div className="text-sm font-semibold flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {stage.totalValue.toLocaleString()}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto">
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : stage.deals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No deals</p>
                    ) : (
                      stage.deals.map((deal) => (
                        <DraggableDeal
                          key={deal.id}
                          deal={deal}
                          onClick={() => handleDealClick(deal)}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              </StageColumn>
            </SortableContext>
          ))}
        </div>
        <DragOverlay>
          {activeDeal && (
            <div className="p-3 border rounded-lg bg-card shadow-lg">
              <div className="font-medium text-sm">{activeDeal.title}</div>
              {activeDeal.value && (
                <div className="text-sm text-muted-foreground">
                  ₹{Number(activeDeal.value).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <DetailViewDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Deal Details"
        fields={detailFields}
        onEdit={handleDetailEdit}
        actions={
  selectedDeal?.stage === "closed_won" ? (
    <p className="text-red-500 text-sm">Closed-Won deals cannot be deleted.</p>
  ) : (
    <Button variant="destructive" onClick={handleDeleteDeal}>
      Delete Deal
    </Button>
  )
}


      />
    </div>
  );
};

export default Pipeline;