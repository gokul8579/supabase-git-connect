import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVirtualizer } from "@tanstack/react-virtual";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  });

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <div className="w-full">
          <Input
            value={options.find((o) => o.value === value)?.label || ""}
            placeholder={placeholder}
            readOnly
            className="cursor-pointer"
            onClick={() => setOpen(true)}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-[300px] p-2">
        {/* Search Box */}
        <Input
          placeholder="Search..."
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {/* Virtualized List */}
        <div
          ref={parentRef}
          className="mt-2"
          style={{ height: "240px", overflowY: "auto" }}
        >
          <div
            style={{
              height: virtualizer.getTotalSize(),
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((v) => {
              const item = filteredOptions[v.index];

              return (
                <div
                  key={item.value}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${v.start}px)`,
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted ${
                    item.value === value ? "bg-primary/10" : ""
                  }`}
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
