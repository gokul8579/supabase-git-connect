import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Edit2, X } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { formatIndianCurrency, formatIndianNumber } from "@/lib/formatUtils";
import { calculateLineItemAmounts } from "@/lib/gstCalculator";

type BillingType = "inclusive_gst" | "exclusive_gst";

const normalizeBillingType = (value: string | null | undefined): BillingType => {
  if (value === "exclusive_gst") return "exclusive_gst";
  return "inclusive_gst";
};



interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  taxable_value?: number; 
  amount: number;
  cgst_amount?: number;
  sgst_amount?: number;
  product_id?: string | null;
    // ADD THESE ↓↓↓
  cgst_percent?: number;
  sgst_percent?: number;
}

interface InvoiceData {
  invoice_number: string;
  date: string;
  due_date?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_state?: string;
  customer_postal_code?: string;
  customer_gst_number?: string;
customer_cin_number?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  cgst_percent?: number;
  sgst_percent?: number;
  // optional IDs used for saving
  quotation_id?: string;
  sales_order_id?: string;
  billing_type?: "inclusive_gst" | "exclusive_gst";
show_gst_split?: boolean;
}

interface CompanySettings {
  company_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  logo_url?: string;
  tax_id?: string;
  gst_number?: string;
  brand_color?: string;
  // optional flags that appear in your old UI
  show_gst_number?: boolean;
  show_tax_id?: boolean;
  show_cin_number?: boolean;
  cin_number?: string;
}

interface InvoiceTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceData | null;
  type?: "invoice" | "quotation";
  onSave?: (updatedData: InvoiceData) => Promise<void>;
}

export const InvoiceTemplate = ({ open, onOpenChange, invoiceData, type = "invoice", onSave }: InvoiceTemplateProps) => {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<InvoiceData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchCompanySettings();
      setEditData(invoiceData);
    }
  }, [open, invoiceData]);

  const fetchCompanySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setCompanySettings(data);
    } catch (error: any) {
      console.error("Error fetching company settings:", error);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${type === "invoice" ? "Invoice" : "Quotation"}_${editData?.invoice_number || ""}`,
  });

  const updateItemField = (index: number, field: keyof InvoiceItem, value: string | number) => {
  if (!editData) return;

  const newItems = [...editData.items];
  newItems[index] = { ...newItems[index], [field]: value };

  // Recalculate GST using your GST engine
  if (field === "quantity" || field === "unit_price") {
    const rate = (editData.cgst_percent || 0) + (editData.sgst_percent || 0);
    const billingType = normalizeBillingType(editData.billing_type);

    const gst = calculateLineItemAmounts(
      Number(newItems[index].unit_price),
      Number(newItems[index].quantity),
      rate,
      billingType
    );

    newItems[index].cgst_amount = gst.cgstAmount;
    newItems[index].sgst_amount = gst.sgstAmount;
    newItems[index].amount = gst.totalAmount;
    newItems[index].taxable_value = gst.taxableValue;
  }

  // Only update items — totals calculated automatically below
  setEditData({
    ...editData,
    items: newItems,
  });
};


  const addItem = () => {
    if (!editData) return;
    setEditData({
      ...editData,
      items: [...editData.items, { description: "", quantity: 1, unit_price: 0, amount: 0 }],
    });
  };

  const removeItem = (index: number) => {
  if (!editData) return;

  const newItems = editData.items.filter((_, i) => i !== index);

  setEditData({
    ...editData,
    items: newItems,
  });
};


  if (!editData) return null;

  // ------------------ PROCESS LINE ITEMS WITH NEW GST ENGINE ------------------
// Always use the values that were saved with the invoice
const billingType = normalizeBillingType(editData.billing_type);
const showSplit = editData.show_gst_split !== false;


const processedItems = editData.items.map(item => {
  const totalRate =
  (item.cgst_percent || 0) + (item.sgst_percent || 0);


  const gst = calculateLineItemAmounts(
    Number(item.unit_price),
    Number(item.quantity),
    totalRate,
    billingType
  );

  return {
    ...item,
    taxable_value: gst.taxableValue,
    cgst_amount: gst.cgstAmount,
    sgst_amount: gst.sgstAmount,
    amount: gst.totalAmount,
  };
});




// Totals (auto recalculated)
//const subtotal = processedItems.reduce((s, i) => s + i.taxable_value, 0);
//const subtotal = processedItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
//const totalCgst = processedItems.reduce((s, i) => s + i.cgst_amount, 0);
//const totalSgst = processedItems.reduce((s, i) => s + i.sgst_amount, 0);
//const taxAmount = totalCgst + totalSgst;
//const total = subtotal + taxAmount - editData.discount_amount;


// Subtotal logic corrected for Inclusive GST
let subtotal = 0;

if (billingType === "inclusive_gst") {
  // Subtotal = actual price entered, which already includes GST
  subtotal = processedItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
} else {
  // Exclusive GST → taxable value becomes subtotal
  subtotal = processedItems.reduce((s, i) => s + i.taxable_value, 0);
}

const totalCgst = processedItems.reduce((s, i) => s + i.cgst_amount, 0);
const totalSgst = processedItems.reduce((s, i) => s + i.sgst_amount, 0);
const taxAmount = totalCgst + totalSgst;

// For Inclusive GST: total should be subtotal - discount
// For Exclusive GST: total = subtotal + gst - discount
let total = 0;

if (billingType === "inclusive_gst") {
  total = subtotal - editData.discount_amount;
} else {
  total = subtotal + taxAmount - editData.discount_amount;
}


  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{type === "invoice" ? "Invoice" : "Quotation"} Preview</DialogTitle>
          <div className="flex items-center gap-2">
            {type === "quotation" && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-muted-foreground">Template</span>
                <select
                  className="border rounded px-2 py-1 bg-background text-foreground"
                  onChange={(e) => (document.body.dataset.invoiceTemplate = e.target.value)}
                  defaultValue={document.body.dataset.invoiceTemplate || "t1"}
                >
                  <option value="t1">Classic</option>
                  <option value="t2">Minimal</option>
                  <option value="t3">Modern</option>
                  <option value="t4">Compact</option>
                  <option value="t5">Elegant</option>
                </select>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel Edit
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogHeader>

        <div ref={printRef} className={`bg-background p-8 space-y-6 text-foreground ${
          (document.body.dataset.invoiceTemplate || "t1") === "t2" ? "" : ""
        }`}>
          {/* Header */}
          <div className={`flex justify-between items-start border-b pb-6 ${
            (document.body.dataset.invoiceTemplate || "t1") === "t3" ? "border-primary" : ""
          }`}>
            <div>
              {companySettings?.logo_url && (
                <img src={companySettings.logo_url} alt="Company Logo" className="h-16 mb-2" />
              )}
              <h2
                className="text-2xl font-bold"
                style={{ color: companySettings?.brand_color || '#F9423A' }}
              >
                {companySettings?.company_name || "Your Company Name"}
              </h2>
              <div className="text-sm mt-2 space-y-1">
  {companySettings?.address && <p>{companySettings.address}</p>}
  {(companySettings?.city || companySettings?.state || companySettings?.postal_code) && (
    <p>{[companySettings.city, companySettings.state, companySettings.postal_code].filter(Boolean).join(", ")}</p>
  )}

  {companySettings?.email && (
    <p><span className="font-bold">Email: </span>{companySettings.email}</p>
  )}

  {companySettings?.phone && (
    <p><span className="font-bold">Phone: </span>{companySettings.phone}</p>
  )}

  {companySettings?.gst_number && (
    <p><span className="font-bold">GST No: </span>{companySettings.gst_number}</p>
  )}

  {companySettings?.cin_number && (
    <p><span className="font-bold">CIN: </span>{companySettings.cin_number}</p>
  )}
</div>

            </div>
            <div className="text-right">
              <h1
                className="text-3xl font-bold uppercase"
                style={{ color: companySettings?.brand_color || '#F9423A' }}
              >
                {type === "invoice" ? "INVOICE" : "QUOTATION"}
              </h1>
              <div className="mt-4 space-y-1 text-sm">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editData.invoice_number}
                      onChange={(e) => setEditData({ ...editData, invoice_number: e.target.value })}
                      placeholder="Number"
                      className="text-right"
                    />
                    <Input
                      type="date"
                      value={editData.date}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      className="text-right"
                    />
                    {editData.due_date && (
                      <Input
                        type="date"
                        value={editData.due_date}
                        onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                        className="text-right"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <p><span className="font-semibold">Number:</span> {editData.invoice_number}</p>
                    <p><span className="font-semibold">Date:</span> {new Date(editData.date).toLocaleDateString()}</p>
                    {editData.due_date && (
                      <p><span className="font-semibold">Due Date:</span> {new Date(editData.due_date).toLocaleDateString()}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div>
            <h3 className="font-semibold text-lg mb-2">Bill To:</h3>
            {isEditing ? (
              <div className="space-y-2 max-w-md">
                <Input
                  value={editData.customer_name}
                  onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                  placeholder="Customer Name"
                />
                <Input
                  value={editData.customer_email || ""}
                  onChange={(e) => setEditData({ ...editData, customer_email: e.target.value })}
                  placeholder="Email"
                />
                <Input
                  value={editData.customer_phone || ""}
                  onChange={(e) => setEditData({ ...editData, customer_phone: e.target.value })}
                  placeholder="Phone"
                />
                <Input
  value={editData.customer_gst_number || ""}
  onChange={(e) => setEditData({ ...editData, customer_gst_number: e.target.value })}
  placeholder="GST Number"
/>

<Input
  value={editData.customer_cin_number || ""}
  onChange={(e) => setEditData({ ...editData, customer_cin_number: e.target.value })}
  placeholder="CIN Number"
/>

                <Textarea
                  value={editData.customer_address || ""}
                  onChange={(e) => setEditData({ ...editData, customer_address: e.target.value })}
                  placeholder="Address"
                  rows={2}
                />
              </div>
            ) : (
              <div className="text-sm space-y-1">
  <p className="font-medium">{editData.customer_name}</p>

  {editData.customer_email && (
    <p>
      <span className="font-bold">Email: </span>
      {editData.customer_email}
    </p>
  )}

  {editData.customer_phone && (
    <p>
      <span className="font-bold">Phone: </span>
      {editData.customer_phone}
    </p>
  )}

  {editData.customer_gst_number && (
    <p>
      <span className="font-bold">GST: </span>
      {editData.customer_gst_number}
    </p>
  )}

  {editData.customer_cin_number && (
    <p>
      <span className="font-bold">CIN: </span>
      {editData.customer_cin_number}
    </p>
  )}

  {editData.customer_address && <p>{editData.customer_address}</p>}

  {(editData.customer_city || editData.customer_state || editData.customer_postal_code) && (
    <p>
      {[editData.customer_city, editData.customer_state, editData.customer_postal_code]
        .filter(Boolean)
        .join(', ')}
    </p>
  )}
</div>

            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-center w-20">Qty</th>
                  <th className="border p-2 text-right w-28">Unit Price</th>
                  <th className="border p-2 text-right w-24">Subtotal</th>
                  <th className="border p-2 text-right w-24">CGST</th>
                  <th className="border p-2 text-right w-24">SGST</th>
                  <th className="border p-2 text-right w-28">Total</th>
                  {isEditing && <th className="border p-2 w-16"></th>}
                </tr>
              </thead>
              <tbody>
                {processedItems.map((item, index) => (
                  <tr key={index}>
                    <td className="border p-2">
                      {isEditing ? (
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateItemField(index, "description", e.target.value)}
                          rows={1}
                        />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemField(index, "quantity", parseFloat(e.target.value) || 0)}
                          className="text-center"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="border p-2 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItemField(index, "unit_price", parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      ) : (
                        formatIndianCurrency(item.unit_price)
                      )}
                    </td>
                    <td className="border p-2 text-right">
  {billingType === "inclusive_gst"
    ? formatIndianCurrency(item.unit_price * item.quantity)
    : formatIndianCurrency(item.taxable_value)}
</td>

                    <td className="border p-2 text-right">
  {billingType === "inclusive_gst" && !showSplit ? (
  "-"
) : (
  <>
    {formatIndianCurrency(item.cgst_amount || 0)}
    {item.taxable_value > 0 && (
      <span className="text-xs text-muted-foreground">
        ({((item.cgst_amount / item.taxable_value) * 100).toFixed(2)}%)
      </span>
    )}
  </>
)}

</td>

                    <td className="border p-2 text-right">
  {billingType === "inclusive_gst" && !showSplit ? (
  "-"
) : (
  <>
    {formatIndianCurrency(item.sgst_amount || 0)}
    {item.taxable_value > 0 && (
      <span className="text-xs text-muted-foreground">
        ({((item.sgst_amount / item.taxable_value) * 100).toFixed(2)}%)
      </span>
    )}
  </>
)}

</td>

                    <td
                      className="border p-2 text-right font-bold"
                      style={{ color: companySettings?.brand_color || '#F9423A' }}
                    >
                      {formatIndianCurrency(item.amount)}
                    </td>
                    {isEditing && (
                      <td className="border p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {isEditing && (
              <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
                Add Item
              </Button>
            )}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">

  {/* Subtotal */}
  <div className="flex justify-between py-2 border-b">
    <span>{billingType === "exclusive_gst" ? "Subtotal:" : "Taxable Value:"}</span>
    <span className="font-medium">
      {formatIndianCurrency(subtotal)}
    </span>
  </div>

  {/* GST Split Rows */}
  {billingType === "exclusive_gst" && (
    <>
      <div className="flex justify-between py-2 border-b">
        <span>CGST:</span>
        <span className="font-medium">{formatIndianCurrency(totalCgst)}</span>
      </div>
      <div className="flex justify-between py-2 border-b">
        <span>SGST:</span>
        <span className="font-medium">{formatIndianCurrency(totalSgst)}</span>
      </div>
    </>
  )}

  {billingType === "inclusive_gst" && showSplit && (
    <>
      <div className="flex justify-between py-2 border-b">
        <span>Included CGST:</span>
        <span className="font-medium">{formatIndianCurrency(totalCgst)}</span>
      </div>
      <div className="flex justify-between py-2 border-b">
        <span>Included SGST:</span>
        <span className="font-medium">{formatIndianCurrency(totalSgst)}</span>
      </div>
    </>
  )}

  {/* Discount */}
  <div className="flex justify-between py-2 border-b">
    <span>Discount:</span>
    <span className="font-medium">{formatIndianCurrency(editData.discount_amount)}</span>
  </div>

  {/* Total */}
  <div
    className="flex justify-between py-3 border-t-2"
    style={{ borderColor: companySettings?.brand_color || '#F9423A' }}
  >
    <span className="text-lg font-bold">Total:</span>
    <span
      className="text-lg font-bold"
      style={{ color: companySettings?.brand_color || '#F9423A' }}
    >
      {formatIndianCurrency(total)}
    </span>
  </div>
</div>

          </div>

          {/* Notes */}
          {(editData.notes || isEditing) && (
            <div>
              <h3 className="font-semibold mb-2">Notes:</h3>
              {isEditing ? (
                <Textarea
                  value={editData.notes || ""}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  placeholder="Add any notes here..."
                />
              ) : (
                <p className="text-sm text-muted-foreground">{editData.notes}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground border-t pt-4 mt-8">
            <p>Thank you for your business!</p>
            {companySettings?.email && <p>For inquiries, contact us at {companySettings.email}</p>}
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              // ---------- SAVE HANDLER START ----------
              if (type === "quotation" && (editData as any).quotation_id) {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;

                  // Delete existing items
                  await supabase
                    .from("quotation_items")
                    .delete()
                    .eq("quotation_id", (editData as any).quotation_id);

                  // Insert updated items
                  const itemsToInsert = processedItems.map((item) => ({
  quotation_id: (editData as any).quotation_id,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  taxable_value: item.taxable_value,   // ✅ IMPORTANT FIX
  amount: item.amount,
  cgst_amount: item.cgst_amount || 0,
  sgst_amount: item.sgst_amount || 0,
  ...(item.product_id ? { product_id: item.product_id } : {}),
}));

                  const { error: itemsError } = await supabase
                    .from("quotation_items")
                    .insert(itemsToInsert);

                  if (itemsError) throw itemsError;

                  // Update quotation totals and other fields (including cgst/sgst percent and valid_until)
                  const { error } = await supabase
                    .from("quotations")
                    .update({
  total_amount: total,
  tax_amount: taxAmount,
  discount_amount: editData.discount_amount,
  notes: editData.notes,
  customer_gst_number: editData.customer_gst_number,
customer_cin_number: editData.customer_cin_number,

  // KEEP the same GST structure as stored
  cgst_percent: editData.cgst_percent,
  sgst_percent: editData.sgst_percent,
  billing_type: editData.billing_type,
  show_gst_split: editData.show_gst_split,

  valid_until: editData.due_date || null,
})
                    .eq("id", (editData as any).quotation_id);

                  if (error) throw error;

                  setIsEditing(false);
                  toast.success("Quotation updated successfully");

                  // Call onSave callback if provided
                  if (onSave) {
                    await onSave(editData);
                  }

                  // Callback to refresh quotations list
                  if ((window as any).__onQuotationUpdate) {
                    (window as any).__onQuotationUpdate();
                  }
                } catch (error) {
                  toast.error("Error updating quotation");
                  console.error(error);
                }
              } else if (type === "invoice" && (editData as any).sales_order_id) {
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) return;

                  // Delete existing items
                  await supabase
                    .from("sales_order_items")
                    .delete()
                    .eq("sales_order_id", (editData as any).sales_order_id);

                  // Insert updated items
                  const itemsToInsert = processedItems.map((item) => {
                    const totalRate = (editData.cgst_percent || 0) + (editData.sgst_percent || 0);
const billingType = normalizeBillingType(editData.billing_type);

const gst = calculateLineItemAmounts(
  item.unit_price,
  item.quantity,
  totalRate,
  billingType
);

const itemData: any = {
  sales_order_id: (editData as any).sales_order_id,
  description: item.description,
  quantity: item.quantity,
  unit_price: item.unit_price,
  taxable_value: gst.taxableValue,
  cgst_amount: gst.cgstAmount,
  sgst_amount: gst.sgstAmount,
  amount: gst.totalAmount,
};
                    // Only include product_id if it exists
                    if ((item as any).product_id) {
                      itemData.product_id = (item as any).product_id;
                    }
                    return itemData;
                  });

                  const { error: itemsError } = await supabase
                    .from("sales_order_items")
                    .insert(itemsToInsert);

                  if (itemsError) throw itemsError;

                  // Calculate subtotal from items
                  //const subtotal = processedItems.reduce((sum, i) => sum + i.taxable_value, 0);

                  let subtotal = 0;

if (billingType === "inclusive_gst") {
  subtotal = processedItems.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
} else {
  subtotal = processedItems.reduce((sum, i) => sum + i.taxable_value, 0);
}


                  // Update sales order totals and details
                  const { error } = await supabase
                    .from("sales_orders")
                    .update({
                      subtotal: subtotal,
                      total_amount: total,
                      tax_amount: taxAmount,

                      discount_amount: editData.discount_amount,
                      notes: editData.notes,
                      cgst_percent: editData.cgst_percent || 9,
                      sgst_percent: editData.sgst_percent || 9,
                      order_date: editData.date,
                      expected_delivery_date: editData.due_date || null,
                      billing_type: editData.billing_type,
                      show_gst_split: editData.show_gst_split,

                    })
                    .eq("id", (editData as any).sales_order_id);

                  if (error) throw error;

                  // Log activity for sales order update
                  await supabase.from("activities").insert({
                    user_id: user.id,
                    activity_type: "sales_order_updated",
                    subject: `Sales order ${editData.invoice_number} updated`,
                    description: `Sales order items, totals, or details were modified`,
                    related_to_type: "sales_order",
                    related_to_id: (editData as any).sales_order_id,
                  } as any);

                  setIsEditing(false);
                  toast.success("Sales order updated successfully!");

                  // Call onSave callback if provided
                  if (onSave) {
                    await onSave(editData);
                  }

                  // Callback to refresh sales orders list
                  if ((window as any).__onSalesOrderUpdate) {
                    (window as any).__onSalesOrderUpdate();
                  }
                } catch (error) {
                  toast.error("Error updating sales order");
                  console.error(error);
                }
              } else if (onSave) {
                // Use custom save handler if provided (fallback)
                try {
                  await onSave(editData);
                  setIsEditing(false);
                  toast.success("Changes saved successfully");
                } catch (error) {
                  toast.error("Error saving changes");
                  console.error(error);
                }
              } else {
                // Fallback: keep same UX as before
                setIsEditing(false);
                toast.success("Changes saved to preview");
              }
              // ---------- SAVE HANDLER END ----------
            }}>
              Save Changes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
