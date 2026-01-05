import { supabase } from "@/integrations/supabase/client";
import { PurchaseOrderAnalytics } from "./reports.types";

/* ======================================================
   PURCHASE ORDER ANALYTICS
====================================================== */

export async function getPurchaseOrderAnalytics(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<PurchaseOrderAnalytics> {
  const applyDate = (q: any, col: string) => {
    if (!startDate || !endDate) return q;
    return q
      .gte(col, startDate + "T00:00:00")
      .lte(col, endDate + "T23:59:59");
  };

  /* ------------------------------------------------------
     FETCH PURCHASE ORDERS
  ------------------------------------------------------ */

  const { data: purchaseOrders } = await applyDate(
    supabase
      .from("purchase_orders")
      .select("*")
      .eq("user_id", userId),
    "order_date"
  );

  if (!purchaseOrders || purchaseOrders.length === 0) {
    return {
      summary: {
        totalPOs: 0,
        totalSpend: 0,
        avgPOValue: 0,
        vendorCount: 0,
      },
      statusSummary: {
        pending: 0,
        received: 0,
        cancelled: 0,
      },
      vendorTotals: [],
      monthlyTrend: [],
      dailyTrend: [],
      topProducts: [],
    };
  }

  /* ------------------------------------------------------
     FETCH PO ITEMS
  ------------------------------------------------------ */

  const poIds = purchaseOrders.map(p => p.id);

  const { data: poItems } = await supabase
    .from("purchase_order_items")
    .select("*")
    .in("purchase_order_id", poIds);

  const items = poItems || [];

  /* ------------------------------------------------------
     SUMMARY
  ------------------------------------------------------ */

  const totalPOs = purchaseOrders.length;

  const totalSpend = purchaseOrders.reduce(
    (s, p) => s + Number(p.total_amount || 0),
    0
  );

  const avgPOValue = totalPOs > 0 ? totalSpend / totalPOs : 0;

  const vendorSet = new Set(
    purchaseOrders.map(p => p.vendor_id).filter(Boolean)
  );

  /* ------------------------------------------------------
     STATUS BREAKDOWN
  ------------------------------------------------------ */

  const statusSummary = {
    pending: purchaseOrders.filter(p => p.status === "pending").length,
    received: purchaseOrders.filter(p => p.status === "received").length,
    cancelled: purchaseOrders.filter(p => p.status === "cancelled").length,
  };

  /* ------------------------------------------------------
     VENDOR TOTALS
  ------------------------------------------------------ */

  const vendorSpendMap: Record<string, number> = {};

  purchaseOrders.forEach(p => {
    const id = p.vendor_id || "unknown";
    vendorSpendMap[id] =
      (vendorSpendMap[id] || 0) + Number(p.total_amount || 0);
  });

  const vendorIds = Object.keys(vendorSpendMap).filter(v => v !== "unknown");

  const { data: vendors } =
    vendorIds.length > 0
      ? await supabase
          .from("vendors")
          .select("id, name")
          .in("id", vendorIds)
      : { data: [] };

  const vendorTotals = Object.entries(vendorSpendMap).map(([id, total]) => {
    const v = vendors?.find(x => x.id === id);
    return {
      name: v?.name || "Unknown Vendor",
      total,
    };
  });

  /* ------------------------------------------------------
     MONTHLY SPEND TREND
  ------------------------------------------------------ */

  const monthMap: Record<string, number> = {};

  purchaseOrders.forEach(p => {
    const d = new Date(p.order_date || p.created_at);
    const key = `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;

    monthMap[key] =
      (monthMap[key] || 0) + Number(p.total_amount || 0);
  });

  const monthlyTrend = Object.entries(monthMap)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => (a.month > b.month ? 1 : -1));

  /* ------------------------------------------------------
     DAILY PURCHASE QUANTITY TREND
  ------------------------------------------------------ */

  const dailyMap: Record<string, number> = {};

  items.forEach(it => {
    const rawDate =
      it.created_at ||
      new Date().toISOString();

    const day = new Date(rawDate).toISOString().split("T")[0];

    dailyMap[day] =
      (dailyMap[day] || 0) + Number(it.quantity || 0);
  });

  const dailyTrend = Object.entries(dailyMap)
    .map(([date, qty]) => ({ date, qty }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  /* ------------------------------------------------------
     TOP PURCHASED PRODUCTS
  ------------------------------------------------------ */

  const productMap: Record<string, number> = {};

  items.forEach(it => {
    const name =
      it.description ||
      "Unknown";

    productMap[name] =
      (productMap[name] || 0) + Number(it.quantity || 0);
  });

  const topProducts = Object.entries(productMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  /* ------------------------------------------------------
     FINAL RETURN
  ------------------------------------------------------ */

  return {
    summary: {
      totalPOs,
      totalSpend,
      avgPOValue,
      vendorCount: vendorSet.size,
    },
    statusSummary,
    vendorTotals,
    monthlyTrend,
    dailyTrend,
    topProducts,
  };
}
