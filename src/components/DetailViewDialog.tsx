import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

export interface DetailField {
  label: string;
  value: any;
  type?: "text" | "badge" | "date" | "datetime" | "currency" | "number" | "textarea" | "select" | "custom";
  badgeColor?: string;
  fieldName?: string;
  selectOptions?: { value: string; label: string }[];
}

interface DetailViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: DetailField[];
  onEdit?: (updatedData: Record<string, any>) => Promise<void>;
  onDelete?: () => Promise<void>;
  actions?: React.ReactNode;
}

export const DetailViewDialog = ({ open, onOpenChange, title, fields, onEdit, onDelete, actions }: DetailViewDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  const handleEditToggle = () => {
    if (!isEditing) {
      // Initialize edit data with current values
      const data: Record<string, any> = {};
      fields.forEach(field => {
        if (field.fieldName) {
          data[field.fieldName] = field.value || "";
        }
      });
      setEditData(data);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (onEdit) {
      await onEdit(editData);
      setIsEditing(false);
      onOpenChange(false);
    }
  };

  // ---- ADD THIS BLOCK ABOVE renderValue() ----
const formatDate = (value: any) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatDateTime = (value: any) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};
// ---- END BLOCK ----


  const renderValue = (field: DetailField) => {
    if (!field.value && field.value !== 0) return "-";
    
    switch (field.type) {
      case "badge":
        return (
          <Badge variant="outline" className={field.badgeColor}>
            {field.value}
          </Badge>
        );
      case "date":
        return formatDate(field.value);
      case "datetime":
        return formatDateTime(field.value);
      case "currency":
        return `₹${Number(field.value).toLocaleString()}`;
      case "select":
        // For select fields, find the label for the value
        const option = field.selectOptions?.find(opt => opt.value === field.value);
        return option?.label || field.value;
      default:
        return field.value;
    }
  };

  const renderEditField = (field: DetailField) => {
    if (!field.fieldName) return null;

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={editData[field.fieldName] || ""}
            onChange={(e) => setEditData({ ...editData, [field.fieldName!]: e.target.value })}
            rows={3}
          />
        );
      case "select":
        return (
          <Select
            value={editData[field.fieldName] || ""}
            onValueChange={(value) => setEditData({ ...editData, [field.fieldName!]: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.selectOptions?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "date":
  return (
    <Input
      type="date"
      value={
        editData[field.fieldName]
          ? editData[field.fieldName].slice(0, 10)
          : ""
      }
      onChange={(e) =>
        setEditData({ ...editData, [field.fieldName!]: e.target.value })
      }
    />
  );

      case "datetime":
        return (
          <Input
            type="datetime-local"
            value={editData[field.fieldName] || ""}
            onChange={(e) => setEditData({ ...editData, [field.fieldName!]: e.target.value })}
          />
        );
      case "currency":
      case "number":
        return (
          <Input
            type="number"
            step="0.01"
            value={editData[field.fieldName] || ""}
            onChange={(e) => setEditData({ ...editData, [field.fieldName!]: e.target.value })}
          />
        );
      default:
        return (
          <Input
            value={editData[field.fieldName] || ""}
            onChange={(e) => setEditData({ ...editData, [field.fieldName!]: e.target.value })}
          />
        );
    }
  };

  const renderCustomField = (value: any) => {
  if (!value || value === "No items found" || !Array.isArray(value) || value.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted text-sm text-muted-foreground">
        No items found
      </div>
    );
  }

  // Recalculate totals
  const subtotal = value.reduce(
    (sum: number, item: any) => sum + (Number(item.price) * Number(item.qty)),
    0
  );

  const total = value.reduce(
    (sum: number, item: any) => sum + Number(item.total),
    0
  );

  const tax = total - subtotal;

  return (
    <div className="mt-4 border rounded-lg bg-white shadow-sm w-full col-span-2">

      {/* Header */}
      <div className="p-4 border-b bg-muted/40 rounded-t-lg">
        <h3 className="text-base font-semibold">Bill Summary</h3>
      </div>

      {/* Table */}
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-2 text-left">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Tax</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>

          <tbody>
            {value.map((item: any, index: number) => {
              const price = Number(item.price);
              const qty = Number(item.qty);
              const totalAmt = Number(item.total);

              // Calculate tax % & amount
              const taxAmount = totalAmt - (price * qty);
              const taxPercent = ((taxAmount / (price * qty)) * 100) || 0;

              return (
                <tr key={index} className="border-b">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-center">{qty}</td>
                  <td className="py-2 text-right">₹{price.toFixed(2)}</td>

                  <td className="py-2 text-right">
                    ₹{taxAmount.toFixed(2)}
                    <span className="text-muted-foreground ml-1">
                      ({taxPercent.toFixed(2)}%)
                    </span>
                  </td>

                  <td className="py-2 text-right font-medium">₹{totalAmt.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 border-t text-sm space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span>Total GST</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>

        <div className="flex justify-between pt-2 border-t font-semibold text-base">
          <span>Grand Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};





  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditToggle}
            >
              <Pencil className="h-4 w-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          )}
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field, index) => (
  <div
    key={index}
    className={
      field.type === "custom"
        ? "col-span-2 space-y-1"   // <-- MAKE FULL WIDTH
        : "space-y-1"
    }
  >
              <Label className="text-muted-foreground text-sm">{field.label}</Label>
              {isEditing ? (
                renderEditField(field)
              ) : (
                <div className="font-medium">
  {field.type === "custom" ? renderCustomField(field.value) : renderValue(field)}
</div>

              )}
            </div>
          ))}
        </div>
        {isEditing && onEdit && (
          <div className="flex justify-between gap-2 pt-4 border-t">
            <div>
              {onDelete && (
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEditToggle}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {!isEditing && actions && (
          <div className="flex justify-start gap-2 pt-4 border-t">
            {actions}
          </div>
        )}
      </DialogContent>
      {onDelete && (
        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          onConfirm={async () => {
            await onDelete();
            onOpenChange(false);
          }}
          title="Delete Item"
          description="Are you sure you want to delete this item? This action cannot be undone."
          variant="destructive"
          confirmText="Delete"
        />
      )}
    </Dialog>
  );
};
