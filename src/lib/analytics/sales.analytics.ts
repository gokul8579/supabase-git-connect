import { supabase } from "@/integrations/supabase/client";
import { SalesAnalytics } from "./reports.types";

export async function getSalesAnalytics(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<SalesAnalytics> {
  const applyDate = (q: any, col: string) => {
    if (!startDate || !endDate) return q;
    return q
      .gte(col, startDate + "T00:00:00")
      .lte(col, endDate + "T23:59:59");
  };

  const [leadsRes, dealsRes, salesOrdersRes, productsRes] = await Promise.all([
    applyDate(supabase.from("leads").select("*").eq("user_id", userId), "created_at"),
    applyDate(supabase.from("deals").select("*").eq("user_id", userId), "created_at"),
    applyDate(
      supabase.from("sales_orders").select("*").eq("user_id", userId),
      "order_date"
    ),
    supabase.from("products").select("*").eq("user_id", userId),
  ]);

  const leads = leadsRes.data || [];
  const deals = dealsRes.data || [];
  const salesOrders = salesOrdersRes.data || [];
  const products = productsRes.data || [];

  let items: any[] = [];
  if (salesOrders.length) {
    const ids = salesOrders.map(o => o.id);
    const { data } = await supabase
      .from("sales_order_items")
      .select("*")
      .in("sales_order_id", ids);
    items = data || [];
  }

  const funnel = [
    { name: "Leads", value: leads.length },
    { name: "Contacted", value: leads.filter(l => l.status === "contacted").length },
    { name: "Qualified", value: leads.filter(l => l.status === "qualified").length },
    { name: "Deals", value: deals.length },
    { name: "Won", value: deals.filter(d => d.stage === "closed_won").length },
  ];

  const monthlyPipeline = Object.entries(
  deals.reduce((a: Record<string, number>, d: any) => {
    const m = d.created_at?.slice(0, 7);
    if (m) a[m] = (a[m] || 0) + Number(d.value || 0);
    return a;
  }, {})
).map(([month, value]) => ({
  month,
  value: Number(value),
}));



  const productAgg: any = {};
  items.forEach(i => {
    const p = products.find(x => x.id === i.product_id);
    if (!p) return;

    productAgg[p.name] ??= { name: p.name, units: 0, revenue: 0, estProfit: 0 };
    productAgg[p.name].units += Number(i.quantity || 0);
    productAgg[p.name].revenue += Number(i.unit_price || 0) * Number(i.quantity || 0);
    productAgg[p.name].estProfit +=
      (Number(i.unit_price || 0) - Number(p.cost_price || 0)) *
      Number(i.quantity || 0);
  });

  return {
    funnel,
    monthlyPipeline,
    productPerformance: Object.values(productAgg),
    revenueBreakdown: {
      byMonth: [],
      byCustomer: [],
      byProductType: [],
    },
  };
}
