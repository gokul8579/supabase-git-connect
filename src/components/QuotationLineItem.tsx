import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { IndianNumberInput } from "@/components/ui/indian-number-input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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
  item: QuotationItem;
  index: number;
  products: any[];
  billingType: "inclusive_gst" | "exclusive_gst";
  onSelectProduct: (index: number, productId: string) => void;
  onUpdate: (index: number, updated: QuotationItem) => void;
  onRemove: (index: number) => void;
}

export const QuotationLineItem = ({
  item,
  index,
  products,
  billingType,
  onSelectProduct,
  onUpdate,
  onRemove,
}: Props) => {
  const updateField = (field: keyof QuotationItem, value: any) => {
    onUpdate(index, { ...item, [field]: value });
  };

  const totalGst = Number(item.cgst_percent) + Number(item.sgst_percent);
  const amount = item.unit_price * item.quantity;
  let taxable = amount;
  let cgst = 0;
  let sgst = 0;
  let total = amount;

  if (totalGst > 0) {
    if (billingType === "inclusive_gst") {
      taxable = (amount * 100) / (100 + totalGst);
      const tax = amount - taxable;
      cgst = tax / 2;
      sgst = tax / 2;
      total = amount;
    } else {
      const tax = (amount * totalGst) / 100;
      cgst = tax / 2;
      sgst = tax / 2;
      total = amount + tax;
    }
  }

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-muted/30">

      {/* PRODUCT SELECT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Select Product</Label>
          <Select
            value={item.product_id}
            onValueChange={(v) => onSelectProduct(index, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — ₹{p.unit_price}
                </SelectItem>
              ))}
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input
            value={item.description}
            onChange={(e) => updateField("description", e.target.value)}
          />
        </div>
      </div>

      {/* NUMBERS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label>Qty</Label>
          <IndianNumberInput
            value={item.quantity}
            onChange={(v) => updateField("quantity", Number(v))}
          />
        </div>

        <div>
          <Label>Unit Price</Label>
          <IndianNumberInput
            value={item.unit_price}
            onChange={(v) => updateField("unit_price", Number(v))}
          />
        </div>

        <div>
          <Label>CGST %</Label>
          <Input
            type="number"
            value={item.cgst_percent}
            onChange={(e) => updateField("cgst_percent", Number(e.target.value))}
          />
        </div>

        <div>
          <Label>SGST %</Label>
          <Input
            type="number"
            value={item.sgst_percent}
            onChange={(e) => updateField("sgst_percent", Number(e.target.value))}
          />
        </div>
      </div>

      {/* GST SUMMARY BOX */}
      <div className="text-sm grid grid-cols-4 gap-3">
        <div><strong>Subtotal:</strong> ₹{taxable.toFixed(2)}</div>
        <div><strong>CGST:</strong> ₹{cgst.toFixed(2)}</div>
        <div><strong>SGST:</strong> ₹{sgst.toFixed(2)}</div>
        <div><strong>Total:</strong> ₹{total.toFixed(2)}</div>
      </div>

      {/* REMOVE BUTTON */}
      <Button variant="destructive" size="sm" onClick={() => onRemove(index)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
