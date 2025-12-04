import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function ProductSelector({ value, products, onChange }) {
  return (
    <Select 
      value={value ?? ""} 
      onValueChange={(v) => onChange(v)}  // ALWAYS return string
    >
      <SelectTrigger>
        <SelectValue placeholder="Select product" />
      </SelectTrigger>

      <SelectContent>
        {products.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} — ₹{p.cost_price}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
