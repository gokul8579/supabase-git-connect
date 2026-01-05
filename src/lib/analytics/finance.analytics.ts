import { supabase } from "@/integrations/supabase/client";
import { FinanceAnalytics } from "./reports.types";

export async function getFinanceAnalytics(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<FinanceAnalytics> {
  const applyDate = (q: any, col: string) => {
    if (!startDate || !endDate) return q;
    return q
      .gte(col, startDate + "T00:00:00")
      .lte(col, endDate + "T23:59:59");
  };

  const { data: purchaseOrders } = await applyDate(
    supabase.from("purchase_orders").select("*").eq("user_id", userId),
    "order_date"
  );

  const po = purchaseOrders || [];

  const totalExpense = po.reduce((s, p) => s + Number(p.total_amount || 0), 0);

  return {
    totalIncome: 0,
    dealsIncome: 0,
    soIncome: 0,

    totalExpense,
    expenseFromLogs: 0,
    expenseFromPO: totalExpense,

    grossProfit: -totalExpense,
    profitMarginPercent: 0,
    netCashFlow: -totalExpense,

    gstSummary: {
      outward: { CGST: 0, SGST: 0, IGST: 0, Total: 0 },
      inward: { GST: 0 },
      net_payable: 0,
    },

    dailyProfit: [],

    topPurchasedProducts: po.map(p => ({
      name: p.vendor_name || "Unknown",
      total: Number(p.total_amount || 0),
    })),
  };
}
