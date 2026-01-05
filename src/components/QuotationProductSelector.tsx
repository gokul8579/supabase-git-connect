import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { IndianNumberInput } from "@/components/ui/indian-number-input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  unit_price: number;
  gst_rate?: number;
}

interface LineItem {
  type: "existing" | "new";
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  cgst_percent: number;
  sgst_percent: number;
}

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export const QuotationProductSelector = ({ items, onChange }: Props) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
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

  const addLineItem = () => {
    onChange([
      ...items,
      {
        type: "new",
        product_id: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        cgst_percent: 0,
        sgst_percent: 0,
      }
    ]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "product_id" && newItems[index].type === "existing") {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].description = product.name;
        newItems[index].unit_price = Number(product.unit_price) || 0;

        const gst = Number(product.gst_rate || 0);
        newItems[index].cgst_percent = gst / 2;
        newItems[index].sgst_percent = gst / 2;
      }
    }

    onChange(newItems);
  };

  const removeLineItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Line Items</Label>
        <Button type="button" size="sm" onClick={addLineItem} variant="outline">
          Add Item
        </Button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-3 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Item Type</Label>
              <Select
                value={item.type}
                onValueChange={(v: "existing" | "new") => updateLineItem(index, "type", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="existing">Existing Product</SelectItem>
                  <SelectItem value="new">Custom Item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {item.type === "existing" && (
              <div className="space-y-2">
                <Label className="text-xs">Select Product</Label>
                <Select
                  value={item.product_id}
                  onValueChange={(v) => updateLineItem(index, "product_id", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — ₹{p.unit_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <Input
              value={item.description}
              onChange={(e) =>
                updateLineItem(index, "description", e.target.value)
              }
            />
          </div>

          {/* Qty and Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quantity</Label>
              <IndianNumberInput
                value={item.quantity}
                onNumericChange={(v) =>
                  updateLineItem(index, "quantity", v || 1)
                }
              />
            </div>

            <div>
              <Label className="text-xs">Unit Price</Label>
              <IndianNumberInput
                value={item.unit_price}
                onNumericChange={(v) =>
                  updateLineItem(index, "unit_price", v || 0)
                }
              />
            </div>
          </div>

          {/* Remove button */}
          <div className="text-right">
            <Button variant="ghost" onClick={() => removeLineItem(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
