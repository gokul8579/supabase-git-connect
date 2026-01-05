import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useState, ReactNode } from "react";
import { 
  Pencil, Trash2, User, Mail, Phone, Building, MapPin, 
  Calendar, DollarSign, FileText, Star, Clock, AlertCircle,
  Briefcase, Hash, Globe, Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EnhancedDetailField {
  label: string;
  value: any;
  icon?: ReactNode;
  type?: "text" | "badge" | "date" | "datetime" | "currency" | "number" | "textarea" | "select" | "custom" | "rating";
  badgeColor?: string;
  fieldName?: string;
  selectOptions?: { value: string; label: string }[];
  disabled?: boolean;
  section?: string;
  fullWidth?: boolean;
}

export interface DetailSection {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface EnhancedDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  fields: EnhancedDetailField[];
  sections?: DetailSection[];
  onEdit?: (updatedData: Record<string, any>) => Promise<void>;
  onDelete?: () => Promise<void>;
  actions?: ReactNode;
  tabs?: { id: string; label: string; content: ReactNode }[];
  headerBadge?: { label: string; variant?: "default" | "secondary" | "destructive" | "outline"; className?: string };
}

const iconMap: Record<string, ReactNode> = {
  name: <User className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  company: <Building className="h-4 w-4" />,
  address: <MapPin className="h-4 w-4" />,
  city: <MapPin className="h-4 w-4" />,
  state: <MapPin className="h-4 w-4" />,
  country: <Globe className="h-4 w-4" />,
  created: <Calendar className="h-4 w-4" />,
  created_at: <Calendar className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  salary: <DollarSign className="h-4 w-4" />,
  notes: <FileText className="h-4 w-4" />,
  interest: <Star className="h-4 w-4" />,
  status: <AlertCircle className="h-4 w-4" />,
  position: <Briefcase className="h-4 w-4" />,
  employee_code: <Hash className="h-4 w-4" />,
  gst: <Receipt className="h-4 w-4" />,
  hire_date: <Calendar className="h-4 w-4" />,
  duration: <Clock className="h-4 w-4" />,
};

const getFieldIcon = (fieldName?: string, customIcon?: ReactNode): ReactNode => {
  if (customIcon) return customIcon;
  if (!fieldName) return null;
  
  const lowerField = fieldName.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerField.includes(key)) return icon;
  }
  return null;
};

export const EnhancedDetailDialog = ({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  fields,
  sections,
  onEdit,
  onDelete,
  actions,
  tabs,
  headerBadge,
}: EnhancedDetailDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(tabs?.[0]?.id || "details");

  const handleEditToggle = () => {
    if (!isEditing) {
      const data: Record<string, any> = {};
      fields.forEach((field) => {
        if (field.fieldName) {
          data[field.fieldName] = field.value !== undefined && field.value !== null ? field.value : "";
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

  const renderRating = (value: number | null) => {
    if (!value) return "-";
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= value ? "fill-warning text-warning" : "text-muted-foreground/30"
            )}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">({value}/5)</span>
      </div>
    );
  };

  const renderValue = (field: EnhancedDetailField) => {
    if (!field.value && field.value !== 0) return <span className="text-muted-foreground">-</span>;

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
        return (
          <span className="font-semibold text-primary">
            ₹{Number(field.value).toLocaleString("en-IN")}
          </span>
        );
      case "rating":
        return renderRating(field.value);
      case "select":
        const option = field.selectOptions?.find((opt) => opt.value === field.value);
        return option?.label || field.value;
      default:
        return field.value;
    }
  };

  const renderEditField = (field: EnhancedDetailField) => {
    if (!field.fieldName) return null;

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={editData[field.fieldName] || ""}
            onChange={(e) => setEditData({ ...editData, [field.fieldName!]: e.target.value })}
            rows={3}
            className="bg-background"
          />
        );
      case "select":
        return (
          <Select
            disabled={field.disabled}
            value={editData[field.fieldName] || ""}
            onValueChange={(value) => setEditData({ ...editData, [field.fieldName!]: value })}
          >
            <SelectTrigger className="bg-background">
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
            value={editData[field.fieldName] ? editData[field.fieldName].slice(0, 10) : ""}
            onChange={(e) => setEditData({ ...editData, [field.fieldName!]: e.target.value })}
            className="bg-background"
          />
        );
      case "datetime":
        return (
          <Input
            type="datetime-local"
            value={editData[field.fieldName] || ""}
            onChange={(e) => setEditData({ ...editData, [field.fieldName!]: e.target.value })}
            className="bg-background"
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
            className="bg-background"
          />
        );
      default:
        return (
          <Input
            value={editData[field.fieldName] || ""}
            onChange={(e) => setEditData({ ...editData, [field.fieldName!]: e.target.value })}
            className="bg-background"
          />
        );
    }
  };

  const groupedFields = sections
    ? sections.map((section) => ({
        ...section,
        fields: fields.filter((f) => f.section === section.id),
      }))
    : [{ id: "default", label: "", fields }];

  const renderDetailsContent = () => (
    <div className="space-y-6">
      {groupedFields.map((group, groupIndex) => (
        <div key={group.id}>
          {group.label && (
            <>
              {groupIndex > 0 && <Separator className="my-4" />}
              <div className="flex items-center gap-2 mb-4">
                {group.icon && <span className="text-primary">{group.icon}</span>}
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h4>
              </div>
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields
              .filter((f) => f.type !== "custom")
              .map((field, index) => (
                <div
                  key={index}
                  className={cn(
                    "group rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50",
                    field.fullWidth && "md:col-span-2"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {getFieldIcon(field.fieldName, field.icon) && (
                      <span className="text-muted-foreground">
                        {getFieldIcon(field.fieldName, field.icon)}
                      </span>
                    )}
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {field.label}
                    </Label>
                  </div>
                  {isEditing && field.fieldName ? (
                    renderEditField(field)
                  ) : (
                    <div className="font-medium text-foreground">{renderValue(field)}</div>
                  )}
                </div>
              ))}
          </div>
          {group.fields
            .filter((f) => f.type === "custom")
            .map((field, index) => (
              <div key={`custom-${index}`} className="mt-4">
                {field.value}
              </div>
            ))}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b">
          <DialogHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {icon && (
                <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                  {icon}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                  {headerBadge && (
                    <Badge variant={headerBadge.variant || "outline"} className={headerBadge.className}>
                      {headerBadge.label}
                    </Badge>
                  )}
                </div>
                {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={handleEditToggle} className="shrink-0">
                <Pencil className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            )}
          </DialogHeader>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          {tabs && tabs.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="details">Details</TabsTrigger>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="details">{renderDetailsContent()}</TabsContent>
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            renderDetailsContent()
          )}
        </ScrollArea>

        {/* Footer */}
        {(isEditing || actions) && (
          <div className="border-t bg-muted/30 px-6 py-4">
            {isEditing && onEdit ? (
              <div className="flex justify-between gap-2">
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
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              </div>
            ) : (
              actions && <div className="flex justify-start gap-2">{actions}</div>
            )}
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