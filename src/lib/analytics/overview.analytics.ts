import { supabase } from "@/integrations/supabase/client";
import { OverviewAnalytics } from "./reports.types";

export async function getOverviewAnalytics(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<OverviewAnalytics> {
  const applyDate = (q: any, col: string) => {
    if (!startDate || !endDate) return q;
    return q
      .gte(col, startDate + "T00:00:00")
      .lte(col, endDate + "T23:59:59");
  };

  const [
    leadsRes,
    customersRes,
    dealsRes,
    salesOrdersRes,
    callsRes,
    dailyLogsRes,
  ] = await Promise.all([
    applyDate(supabase.from("leads").select("*").eq("user_id", userId), "created_at"),
    applyDate(supabase.from("customers").select("*").eq("user_id", userId), "created_at"),
    applyDate(supabase.from("deals").select("*").eq("user_id", userId), "created_at"),
    applyDate(
      supabase
        .from("sales_orders")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "delivered")
        .eq("payment_status", "paid"),
      "order_date"
    ),
    applyDate(supabase.from("calls").select("*").eq("user_id", userId), "created_at"),
    applyDate(supabase.from("daily_logs").select("*").eq("user_id", userId), "log_date"),
  ]);

  const leads = leadsRes.data || [];
  const customers = customersRes.data || [];
  const deals = dealsRes.data || [];
  const salesOrders = salesOrdersRes.data || [];
  const calls = callsRes.data || [];
  const dailyLogs = dailyLogsRes.data || [];

  const wonDeals = deals.filter(d => d.stage === "closed_won");
  const lostDeals = deals.filter(d => d.stage === "closed_lost");
  const activeDeals = deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage));

  const totalExpenses = dailyLogs.reduce(
    (s, l) => s + Number(l.expense_amount || 0),
    0
  );

  return {
    summary: {
      totalLeads: leads.length,
      convertedLeads: leads.filter(l => l.status === "qualified").length,

      totalCustomers: customers.length,

      totalDeals: deals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      activeDeals: activeDeals.length,

      dealRevenue: 0,
      salesOrderRevenue: 0,
      totalRevenue: 0,

      serviceCharges: 0,
      taxCollected: 0,

      salesOrderProfit: 0,
      dealProfit: 0,
      totalProfit: 0,

      totalExpenses,

      totalCalls: calls.length,
      completedCalls: calls.filter(c => c.status === "completed").length,
    },

    leadsBySource: Object.entries(
  leads.reduce((a: Record<string, number>, l: any) => {
    const key = l.source || "unknown";
    a[key] = (a[key] || 0) + 1;
    return a;
  }, {})
).map(([name, value]) => ({
  name,
  value: Number(value),
})),



    dealsByStage: Object.entries(
  deals.reduce((a: Record<string, number>, d: any) => {
    const key = d.stage || "unknown";
    a[key] = (a[key] || 0) + 1;
    return a;
  }, {})
).map(([name, value]) => ({
  name,
  value: Number(value),
})),


  };
}
