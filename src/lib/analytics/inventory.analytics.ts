import { supabase } from "@/integrations/supabase/client";
import { InventoryAnalytics } from "./reports.types";

export async function getInventoryAnalytics(
  userId: string
): Promise<InventoryAnalytics> {
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId);

  const p = products || [];

  return {
    totalValue: p.reduce((s, x) => s + Number(x.quantity_in_stock || 0) * Number(x.cost_price || 0), 0),
    totalUnits: p.reduce((s, x) => s + Number(x.quantity_in_stock || 0), 0),

    itemsInRange: 0,
    itemsOutRange: 0,

    reorderCount: p.filter(x => x.reorder_level && x.quantity_in_stock <= x.reorder_level).length,

    stockTrend: [],
    topSold: [],
    slowMoving: [],
  };
}
