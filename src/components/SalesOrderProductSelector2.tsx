import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { IndianNumberInput } from "@/components/ui/indian-number-input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { toast } from "./ui/sonner";


interface Product {
  id: string;
  name: string;
  unit_price: number;
  gst_rate?: number; // optional: product-level gst %
}

interface LineItem {
  type: "existing" | "service";
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  cgst_percent: number;
  sgst_percent: number;
  available_stock?: number;
}

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

type BillingType = "inclusive_gst" | "exclusive_gst" | "no_gst";

/** Local GST calculator (same logic as GST engine discussed)
 * amount = unitPrice * qty
 * if billingType === 'inclusive_gst' -> taxableValue = amount * 100 / (100 + gstRate)
 * else taxableValue = amount (exclusive)
 * totalTax = amount - taxableValue (inclusive) or taxableValue * gstRate / 100 (exclusive)
 * split tax into CGST/SGST equally
 * 
 */

const fetchAvailableStock = async (productId: string) => {
  const { data: product } = await supabase
    .from("products")
    .select("quantity_in_stock")
    .eq("id", productId)
    .single();

  const actualStock = Number(product?.quantity_in_stock || 0);

  const { data: reservedDealsRaw } = await supabase
  .from("deal_items")
  .select("id, quantity, deal_id")
  .eq("product_id", productId);

// Fetch stages separately (TS SAFE)
let reservedPipeline = 0;

if (reservedDealsRaw?.length) {
  const dealIds = reservedDealsRaw.map((d) => d.deal_id);

  const { data: dealsData } = await supabase
    .from("deals")
    .select("id, stage")
    .in("id", dealIds);

  reservedPipeline = reservedDealsRaw.reduce((sum, d) => {
    const deal = dealsData?.find((x) => x.id === d.deal_id);
    if (!deal) return sum;
    if (deal.stage === "closed_won" || deal.stage === "closed_lost") return sum;
    return sum + (d.quantity || 0);
  }, 0);
}


  // STEP 1: Get the raw rows from sales_order_items
const { data: reservedSORaw } = await supabase
  .from("sales_order_items")
  .select("id, quantity, sales_order_id")
  .eq("product_id", productId);

// Default reserved qty
let reservedSOQty = 0;

// STEP 2: Fetch related sales orders separately (TS SAFE)
if (reservedSORaw?.length) {
  const soIds = reservedSORaw.map((s) => s.sales_order_id);

  const { data: soData } = await supabase
    .from("sales_orders")
    .select("id, status")
    .in("id", soIds);

  reservedSOQty = reservedSORaw.reduce((sum, s) => {
    const so = soData?.find((x) => x.id === s.sales_order_id);
    if (!so) return sum;
    if (so.status !== "draft") return sum;
    return sum + (s.quantity || 0);
  }, 0);
}

return actualStock - reservedPipeline - reservedSOQty;

};


function calculateLineItemAmounts(unitPrice: number, quantity: number, gstRate: number, billingType: BillingType) {
  const amount = unitPrice * quantity;
  if (gstRate === 0 || billingType === "no_gst") {
    return {
      taxableValue: parseFloat(amount.toFixed(2)),
      cgstAmount: 0,
      sgstAmount: 0,
      totalTax: 0,
      totalAmount: parseFloat(amount.toFixed(2)),
    };
  }

  let taxableValue: number;
  let totalTax: number;

  if (billingType === "inclusive_gst") {
    taxableValue = (amount * 100) / (100 + gstRate);
    totalTax = amount - taxableValue;
  } else {
    taxableValue = amount;
    totalTax = (taxableValue * gstRate) / 100;
  }

  const cgstAmount = parseFloat((totalTax / 2).toFixed(2));
  const sgstAmount = parseFloat((totalTax - cgstAmount).toFixed(2));
  const totalAmount = parseFloat((taxableValue + totalTax).toFixed(2));

  return {
    taxableValue: parseFloat(taxableValue.toFixed(2)),
    cgstAmount,
    sgstAmount,
    totalTax: parseFloat(totalTax.toFixed(2)),
    totalAmount,
  };
}

export const SalesOrderProductSelector2 = ({ items, onChange }: Props) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [billingType, setBillingType] = useState<BillingType>("inclusive_gst");
  const [showGstSplit, setShowGstSplit] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("company_settings")
        .select("billing_type, show_gst_split")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setBillingType((data as any).billing_type || "inclusive_gst");
        setShowGstSplit((data as any).show_gst_split !== false);
      }
    } catch (err) {
      console.error("Error fetching company settings:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // try to fetch gst_rate if present on products table
      const { data, error } = await supabase
        .from("products")
        .select("id, name, unit_price, cost_price, gst_rate")
        .eq("user_id", user.id);

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const addLineItem = () => {
    onChange([...items, { type: "service", product_id: "", description: "", quantity: 1, unit_price: 0, cost_price: 0, cgst_percent: 0, sgst_percent: 0 }]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // If switching to existing and product selected, auto-fill
    if (field === "product_id" && newItems[index].type === "existing" && value) {
  const product = products.find(p => p.id === value);

  if (product) {
    newItems[index].description = product.name;
    newItems[index].unit_price = Number(product.unit_price) || 0;
    newItems[index].cost_price = Number((product as any).cost_price) || 0;

    // Auto-set GST
    if (typeof (product as any).gst_rate === "number") {
      const totalRate = Number((product as any).gst_rate) || 0;
      const half = parseFloat((totalRate / 2).toFixed(2));
      newItems[index].cgst_percent = half;
      newItems[index].sgst_percent = totalRate - half;
    }

    // *** FETCH STOCK ***
    fetchAvailableStock(value).then((available) => {
      newItems[index].available_stock = available;

      if (newItems[index].quantity > available) {
        toast.error(`Only ${available} units available`);
        newItems[index].quantity = available;
      }

      onChange([...newItems]); // update parent
    });

    return; // stop here to avoid extra onChange below
  }
}


    // If user manually edits cgst/sgst we keep it as-is.
    // Keep quantity and price as numbers
    if (field === "quantity" || field === "unit_price" || field === "cgst_percent" || field === "sgst_percent") {
      if (typeof newItems[index][field] === "string") {
        // try parse
        const parsed = parseFloat(newItems[index][field] as any);
        newItems[index][field] = isNaN(parsed) ? 0 : parsed;
      }
    }

    onChange(newItems);
  };

  const removeLineItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const formatCurrency = (v: number) =>
    `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Line Items</Label>
        <Button type="button" size="sm" onClick={addLineItem} variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {items.map((item, index) => {
        // compute display amounts using current state
        const totalGstRate = (Number(item.cgst_percent || 0) + Number(item.sgst_percent || 0));
        const computed =
  item.type === "service"
    ? {
        taxableValue: item.unit_price,
        totalAmount: item.unit_price,
        cgstAmount: 0,
        sgstAmount: 0,
      }
    : calculateLineItemAmounts(item.unit_price, item.quantity, totalGstRate, billingType);


        return (
          <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
            <div className="flex justify-between items-start gap-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                <div className="space-y-2">
                  <Label className="text-xs">Item Type</Label>
                  <Select
                    value={item.type}
                    onValueChange={(v: "existing" | "service") => updateLineItem(index, "type", v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="existing">Product</SelectItem>
                      <SelectItem value="service">Service Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {item.type === "existing" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Select Product *</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(v) => updateLineItem(index, "product_id", v)}
                      required
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Choose product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} - ₹{Number(p.unit_price).toLocaleString('en-IN')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {item.type === "service" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Service Type *</Label>
                    <Select
                      value={item.description || ""}
                      onValueChange={(v) => {
                        const newItems = [...items];
                        newItems[index] = { ...newItems[index], description: v };
                        // Set default prices for common services
                        if (v === "Installation Charge") {
                          newItems[index].unit_price = 500;
                        } else if (v === "Delivery Charge") {
                          newItems[index].unit_price = 200;
                        } else if (v === "Transport Charge") {
                          newItems[index].unit_price = 300;
                        } else if (v === "Packaging Charge") {
                          newItems[index].unit_price = 100;
                        } else if (v === "Other Service") {
                          newItems[index].unit_price = 0;
                        }
                        onChange(newItems);
                      }}
                      required
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Installation Charge">Installation Charge</SelectItem>
                        <SelectItem value="Delivery Charge">Delivery Charge</SelectItem>
                        <SelectItem value="Transport Charge">Transport Charge</SelectItem>
                        <SelectItem value="Packaging Charge">Packaging Charge</SelectItem>
                        <SelectItem value="Other Service">Other Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLineItem(index)}
                className="ml-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {item.type === "service" && (
                <div className="space-y-2 md:col-span-2">
                  {item.description === "Other Service" ? (
                    <>
                      <Label className="text-xs">Service Description *</Label>
                      <Input
                        className="h-9"
                        placeholder="Enter service name"
                        value={item.description === "Other Service" ? "" : item.description}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index] = { ...newItems[index], description: e.target.value };
                          onChange(newItems);
                        }}
                        required
                      />
                    </>
                  ) : item.description ? (
                    <>
                      <Label className="text-xs">Service</Label>
                      <Input className="h-9" value={item.description} disabled readOnly />
                    </>
                  ) : (
                    <>
                      <Label className="text-xs">Service Description *</Label>
                      <Input className="h-9" placeholder="Select service type above" disabled />
                    </>
                  )}
                </div>
              )}

              {item.type === "existing" && (
  <div className="space-y-2 md:col-span-2">
    <Label className="text-xs flex items-center gap-2">
      Product Description

      {item.available_stock !== undefined && (
        <span
          className={
            "px-2 py-0.5 text-xs rounded " +
            (item.available_stock > 10
              ? "bg-green-100 text-green-700"
              : item.available_stock > 0
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700")
          }
        >
          Stock: {item.available_stock}
        </span>
      )}
    </Label>

    <Input className="h-9" value={item.description} disabled readOnly />
  </div>
)}


              {item.type === "existing" && (
  <div className="space-y-2">
    <Label className="text-xs">Quantity *</Label>
    <IndianNumberInput
      className="h-9"
      value={item.quantity}
      onNumericChange={(v) => {
        const newQty = v || 1;

        if (item.available_stock !== undefined && newQty > item.available_stock) {
          toast.error(`Cannot exceed stock (${item.available_stock})`);
          updateLineItem(index, "quantity", item.available_stock);
          return;
        }

        updateLineItem(index, "quantity", newQty);
      }}
    />
  </div>
)}


              <div className="space-y-2">
                <Label className="text-xs">Unit Price (₹) *</Label>
                <IndianNumberInput
                  className="h-9"
                  value={item.unit_price}
                  onNumericChange={(v) => updateLineItem(index, "unit_price", v || 0)}
                  disabled={item.type === "existing" && !!item.product_id}
                />
                {item.type === "service" && (
                  <p className="text-xs text-muted-foreground">Enter service charge amount</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {item.type === "existing" && showGstSplit && (
  <>
    <div className="space-y-2">
      <Label className="text-xs">CGST (%)</Label>
      <Input
        className="h-9"
        type="number"
        step="0.01"
        value={item.cgst_percent}
        onChange={(e) =>
          updateLineItem(index, "cgst_percent", parseFloat(e.target.value) || 0)
        }
      />
    </div>

    <div className="space-y-2">
      <Label className="text-xs">SGST (%)</Label>
      <Input
        className="h-9"
        type="number"
        step="0.01"
        value={item.sgst_percent}
        onChange={(e) =>
          updateLineItem(index, "sgst_percent", parseFloat(e.target.value) || 0)
        }
      />
    </div>
  </>
)}

{item.type === "service" && (
  <div className="col-span-2 text-sm text-muted-foreground">
    No GST for service items
  </div>
)}


              <div className="space-y-2">
                <Label className="text-xs">Subtotal</Label>
                <Input
                  className="h-9 font-medium"
                  value={formatCurrency(computed.taxableValue)}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Total (with tax)</Label>
                <Input
                  className="h-9 font-bold"
                  value={formatCurrency(computed.totalAmount)}
                  disabled
                />
              </div>
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <p className="text-sm">No items added yet</p>
          <p className="text-xs mt-1">Click "Add Item" to start</p>
        </div>
      )}
    </div>
  );
};
