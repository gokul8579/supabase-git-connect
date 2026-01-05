import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

interface TemplatePreviewProps {
  templateId: string;
  selected: boolean;
  onSelect: () => void;
}

export const TemplatePreview = ({ templateId, selected, onSelect }: TemplatePreviewProps) => {
  const templates = {
    t1: {
      name: "Modern Professional",
      preview: (
        <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-white p-4 border rounded">
          <div className="text-xs font-bold text-blue-900 mb-2">COMPANY NAME</div>
          <div className="text-[8px] text-gray-600">Invoice #12345</div>
          <div className="mt-4 space-y-1">
            <div className="h-1 bg-blue-200 rounded w-3/4"></div>
            <div className="h-1 bg-gray-200 rounded w-2/3"></div>
            <div className="h-1 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="mt-4 pt-2 border-t border-blue-100">
            <div className="text-[8px] font-bold text-blue-900">Total: ₹0.00</div>
          </div>
        </div>
      ),
    },
   
  };

  const template = templates[templateId as keyof typeof templates];

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selected ? "ring-2 ring-primary shadow-lg" : ""
      }`}
      onClick={onSelect}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-sm">{template.name}</h3>
          {selected && (
            <div className="bg-primary text-primary-foreground rounded-full p-1">
              <Check className="h-3 w-3" />
            </div>
          )}
        </div>
        {template.preview}
      </div>
    </Card>
  );
};
