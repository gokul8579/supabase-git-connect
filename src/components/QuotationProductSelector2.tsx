import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QuotationLineItem } from "@/components/QuotationLineItem";

export interface QuotationItem {
  type: "existing" | "service";
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  cgst_percent: number;
  sgst_percent: number;
}

interface Props {
  items: QuotationItem[];
  onChange: (items: QuotationItem[]) => void;
}

type BillingType = "inclusive_gst" | "exclusive_gst";

export const QuotationProductSelector2 = ({ items, onChange }: Props) => {
  const [products, setProducts] = useState<any[]>([]);
  const [billingType, setBillingType] = useState<BillingType>("inclusive_gst");

  useEffect(() => {
    fetchProducts();
    fetchCompanySettings();
  }, []);

  const fetchProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("products")
      .select("id, name, unit_price, gst_rate")
      .eq("user_id", user.id);

    setProducts(data || []);
  };

  const fetchCompanySettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("company_settings")
      .select("billing_type")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data?.billing_type === "inclusive_gst") {
  setBillingType("inclusive_gst");
} else if (data?.billing_type === "exclusive_gst") {
  setBillingType("exclusive_gst");
} else {
  setBillingType("inclusive_gst"); // default
}

  };

  const addItem = () => {
    onChange([
      ...items,
      {
        type: "existing",
        product_id: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        cgst_percent: 0,
        sgst_percent: 0,
      },
    ]);
  };

  const updateItem = (index: number, updated: QuotationItem) => {
    const newItems = [...items];
    newItems[index] = updated;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleSelectProduct = (index: number, productId: string) => {
    if (productId === "service") {
      updateItem(index, {
        ...items[index],
        type: "service",
        product_id: "",
        description: "",
        unit_price: 0,
        cgst_percent: 0,
        sgst_percent: 0,
      });
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const gst = Number(product.gst_rate || 0);
    const half = parseFloat((gst / 2).toFixed(2));

    const updated: QuotationItem = {
      ...items[index],
      type: "existing",
      product_id: productId,
      description: product.name,
      unit_price: Number(product.unit_price) || 0,
      cgst_percent: half,
      sgst_percent: half,
    };

    updateItem(index, updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Line Items</Label>

        <Button type="button" size="sm" onClick={addItem} variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      {items.map((item, index) => (
  <QuotationLineItem
    key={index}
    item={item}
    index={index}
    products={products}
    billingType={billingType}
    onSelectProduct={handleSelectProduct}
    onUpdate={updateItem}
    onRemove={removeItem}
  />
))}


      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <p className="text-sm">No items added yet</p>
          <p className="text-xs mt-1">Click “Add Item” to start</p>
        </div>
      )}
    </div>
  );
};
