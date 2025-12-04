import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface FilterOption {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "number";
  options?: { value: string; label: string }[];
}

interface AdvancedFiltersProps {
  filters: FilterOption[];
  appliedFilters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearAll: () => void;
}

export const AdvancedFilters = ({
  filters,
  appliedFilters,
  onFilterChange,
  onClearAll,
}: AdvancedFiltersProps) => {
  const [open, setOpen] = useState(false);
  const activeFiltersCount = Object.keys(appliedFilters).filter(
    key => appliedFilters[key] !== null && appliedFilters[key] !== undefined && appliedFilters[key] !== "" && appliedFilters[key] !== "all"
  ).length;

  const handleClearFilter = (key: string) => {
    onFilterChange(key, null);
  };

  const renderFilterInput = (filter: FilterOption) => {
    const value = appliedFilters[filter.key] || "";

    switch (filter.type) {
      case "text":
        return (
          <Input
            value={value}
            onChange={(e) => onFilterChange(filter.key, e.target.value)}
            placeholder={`Filter by ${filter.label.toLowerCase()}`}
            className="w-full"
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => onFilterChange(filter.key, e.target.value ? Number(e.target.value) : null)}
            placeholder={`Filter by ${filter.label.toLowerCase()}`}
            className="w-full"
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => onFilterChange(filter.key, e.target.value || null)}
            className="w-full"
          />
        );
      case "select":
        return (
          <Select
            value={value || "all"}
            onValueChange={(v) => onFilterChange(filter.key, v === "all" ? null : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.label}</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Advanced Filters</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.map((filter) => {
                const value = appliedFilters[filter.key];
                if (!value || value === "" || value === "all") return null;
                return (
                  <Badge key={filter.key} variant="secondary" className="gap-1">
                    {filter.label}: {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    <button
                      onClick={() => handleClearFilter(filter.key)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <Label className="text-sm font-medium">{filter.label}</Label>
                {renderFilterInput(filter)}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
          {activeFiltersCount > 0 && (
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Clear All
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

