// src/pages/Reports.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IndianRupee } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { 
  Download, Target, Users, TrendingUp, DollarSign, ShoppingBag, FileText, Phone,
  Filter, PlusCircle, CheckCircle, Banknote, FilePlus, BarChart3, Truck, 
  Wallet, TrendingDown, Percent, ShoppingCart, CreditCard, Database, Package, Activity, AlertCircle, Zap
} from "lucide-react";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

import html2canvas from "html2canvas";
import { ProductivityMeter } from "@/components/dashboard/ProductivityMeter";

interface PurchaseOrderInsights {
  summary: {
    totalPOs: number;
    totalSpend: number;
    avgPOValue: number;
    vendorCount: number;
  };
  statusSummary: {
    pending: number;
    received: number;
    cancelled: number;
  };
  vendorTotals: { name: string; total: number }[];
  monthlyPOs: { month: string; total: number }[];
  topProducts: { name: string; qty: number }[];
  dailyTrend: { date: string; qty: number }[];
}


const COLORS = [
  "#F9423A",
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
];

type TabKey =
  | "overview"
  | "sales"
  | "finance"
  | "inventory"
  | "purchase_orders"
  | "activities";

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const reportRef = useRef<HTMLDivElement>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loadedTabs, setLoadedTabs] = useState<Record<TabKey, boolean>>({
    overview: true,
    sales: false,
    finance: false,
    inventory: false,
    purchase_orders: false,
    activities: false,
  });

  // missing states that threw errors earlier
  const [poInsights, setPoInsights] = useState({
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
  monthlyPOs: [],
  topProducts: [],
  dailyTrend: [],
});

type ActivityStats = {
  byType: { name: string; value: number }[];
  daily: { date: string; count: number }[];
  dailyMinutes: { date: string; minutes: number }[];
  totalMinutes: number;
  productiveMinutes: number;
  completionRate: number;
  focusIndex: number;
  productivityScore: number;
  overloadDays: number;
  onlineMinutes: number;
};


  const [activityStats, setActivityStats] = useState<ActivityStats>({
  byType: [],
  daily: [],
  dailyMinutes: [],
  totalMinutes: 0,
  productiveMinutes: 0,
  completionRate: 0,
  focusIndex: 0,
  productivityScore: 0,
  overloadDays: 0,
  onlineMinutes: 0,
});



  // tab datasets
  const [funnelData, setFunnelData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyPipeline, setMonthlyPipeline] = useState<any[]>([]);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<any>({
    byMonth: [],
    byCustomer: [],
    byProductType: [],
  });

  const [inventoryData, setInventoryData] = useState<any>(null);

  const [aiData, setAiData] = useState(null);
const [loadingAI, setLoadingAI] = useState(false);


  // finance & inventory specific
  const [financeData, setFinanceData] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [stockValue, setStockValue] = useState<number>(0);
  const [inventoryOverview, setInventoryOverview] = useState<any>(null);
  const [useDateFilter, setUseDateFilter] = useState(true);




  const [tabLoading, setTabLoading] = useState<Record<TabKey, boolean>>({
    overview: false,
    sales: false,
    finance: false,
    inventory: false,
    purchase_orders: false,
    activities: false,
  });


  const sessionStartRef = useRef<number | null>(null);
const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);


  

  

 // Refresh the currently active tab when date changes
useEffect(() => {
  loadTabData(activeTab);
}, [activeTab, startDate, endDate, useDateFilter]);


const applyDateFilter = (query: any, column: string) => {
  // If Clear Date Filter is pressed → simply return query as-is
  if (!useDateFilter) return query;

  // If dates are blank → also skip filtering
  if (!startDate || !endDate) return query;

  const startISO = new Date(startDate + "T00:00:00");
  const endISO = new Date(endDate + "T23:59:59");

  // prevent RangeError: invalid date
  if (isNaN(startISO.getTime()) || isNaN(endISO.getTime())) return query;

  return query
    .gte(column, startISO.toISOString())
    .lte(column, endISO.toISOString());
};





  // ---------- OVERVIEW ----------
  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      setTabLoading((t) => ({ ...t, overview: true }));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const start = useDateFilter && startDate ? new Date(startDate) : null;
const end = useDateFilter && endDate ? new Date(endDate) : null;

      

      const [
        leads,
        customers,
        deals,
        salesOrders,
        dailyLogs,
        calls,
        products,
      ] = await Promise.all([
        applyDateFilter(
  supabase.from("leads").select("*").eq("user_id", user.id),
  "created_at"
),

        applyDateFilter(
  supabase.from("customers").select("*").eq("user_id", user.id),
  "created_at"
),

        applyDateFilter(
  supabase.from("deals").select("*").eq("user_id", user.id),
  "created_at"
),

        applyDateFilter(
  supabase
    .from("sales_orders")
    .select("*")
    .eq("user_id", user.id),
  "order_date"
),




        applyDateFilter(
  supabase.from("daily_logs").select("*").eq("user_id", user.id),
  "log_date"
),

        applyDateFilter(
  supabase.from("calls").select("*").eq("user_id", user.id),
  "created_at"
),
          

        applyDateFilter(
  supabase.from("products").select("*").eq("user_id", user.id),
  "created_at"
),
      ]); 

      const validSalesOrders = (salesOrders.data || []).filter(
  (o: any) =>
    o.status === "delivered" &&
    o.payment_status === "paid"
);

const validSalesOrderIds = validSalesOrders.map((o: any) => o.id);


      // sales order items
      // sales order items (line-level data)
let salesOrderItems: any[] = [];
if (salesOrders.data && salesOrders.data.length > 0) {
  //const orderIds = salesOrders.data.map((o: any) => o.id);
  const orderIds = validSalesOrderIds;
  const { data: items } = await supabase
  .from("sales_order_items")
  .select(
    "*, products:products(product_type, cost_price)"
  )
  .in("sales_order_id", orderIds);


  salesOrderItems = items || [];
}

// ---------- IMPORTANT: calculate sales order revenue & tax from line items ----------
let totalSalesOrderDiscount = 0;
// Helper: get taxable amount for a line. Use saved taxable_value if present,
// otherwise fallback to (unit_price * quantity).
const getLineTaxable = (it: any) =>
  Number(
    (it.taxable_value ?? (Number(it.unit_price || 0) * Number(it.quantity || 0))) || 0
  );


// Compute sales order revenue (exclude GST) by summing taxable value per line
// SALES ORDER REVENUE = ONLY GOODS (exclude service)
// FIX: subtract SO-level discount fairly across goods lines
const salesOrderRevenueFromItems = (() => {
  let total = 0;

  // First sum all goods taxable values
  const goodsLines = (salesOrderItems || []).filter(
    (it: any) => (it.products?.product_type || "").toLowerCase() === "goods"
  );

  const totalGoodsTaxable = goodsLines.reduce((sum: number, it: any) => {
    return sum + getLineTaxable(it);
  }, 0);

  // Calculate SO header discounts for each order
  const orderDiscountMap: Record<string, number> = {};
(validSalesOrders || []).forEach((o: any) => {
  orderDiscountMap[o.id] = Number(o.discount_amount || 0);
});


  // ---------- SALES ORDER TOTAL DISCOUNT ----------
totalSalesOrderDiscount = Object.values(orderDiscountMap).reduce(
  (sum: number, d: number) => sum + d,
  0
);



  // Apply discount proportionally per SO
  goodsLines.forEach((it: any) => {
    const base = getLineTaxable(it);
    const orderId = it.sales_order_id;
    const soDiscount = orderDiscountMap[orderId] || 0;

    // compute total goods taxable PER ORDER
const orderGoodsTotal = goodsLines
  .filter(g => g.sales_order_id === orderId)
  .reduce((s, g) => s + getLineTaxable(g), 0) || 1;

const discountShare = (base / orderGoodsTotal) * soDiscount;


    total += base - discountShare;
  });

  return total;
})();



// Compute total tax collected (outward) from cgst/sgst/igst fields on lines
const totalTaxCollectedFromItems = (salesOrderItems || []).reduce((sum: number, it: any) => {
  return (
    sum +
    Number(it.cgst_amount || 0) +
    Number(it.sgst_amount || 0) +
    Number(it.igst_amount || 0)
  );
}, 0);






// set these values later into reportData.summary (below)


      const wonDeals = deals.data?.filter((d: any) => d.stage === "closed_won") || [];

    //  const dealIds = (deals.data || []).map((d: any) => d.id);
    const wonDealIds = wonDeals.map((d: any) => d.id);
let dealItems: any[] = [];

if (wonDealIds.length > 0) {
 const { data: dItems } = await supabase
  .from("deal_items")
  .select(`
    *,
    products:products(*)
  `)
  .in("deal_id", wonDealIds);
  dealItems = dItems || [];
}


      const lostDeals = deals.data?.filter((d: any) => d.stage === "closed_lost") || [];
      const activeDeals =
        deals.data?.filter((d: any) => d.stage !== "closed_won" && d.stage !== "closed_lost") || [];
      const convertedLeads = leads.data?.filter((l: any) => l.status === "qualified") || [];

      const totalRevenue = wonDeals.reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0);
      const totalProfit = wonDeals.reduce((sum: number, d: any) => sum + (Number(d.expected_profit) || 0), 0);

      //const completedOrders = salesOrders.data?.filter((o: any) => o.status === "delivered") || [];
      const completedOrders = validSalesOrders;
      const pendingOrders =
        salesOrders.data?.filter((o: any) => o.status !== "delivered" && o.status !== "cancelled") || [];

      const completedCalls = calls.data?.filter((c: any) => c.status === "completed") || [];

      const conversionRate =
        leads.data && leads.data.length > 0
          ? Math.min((convertedLeads.length / leads.data.length) * 100, 100)
          : 0;

      const leadSourceCounts: Record<string, number> = {};
      leads.data?.forEach((lead: any) => {
        leadSourceCounts[lead.source] = (leadSourceCounts[lead.source] || 0) + 1;
      });

      const dealStageCounts: Record<string, number> = {};
      deals.data?.forEach((deal: any) => {
        dealStageCounts[deal.stage] = (dealStageCounts[deal.stage] || 0) + 1;
      });

      const totalExpenses =
        dailyLogs.data?.reduce((sum: number, log: any) => sum + Number(log.expense_amount || 0), 0) || 0;

      const totalIncome =
        dailyLogs.data?.reduce((sum: number, log: any) => sum + Number(log.income_amount || 0), 0) || 0;

      const totalSales =
        dailyLogs.data?.reduce((sum: number, log: any) => sum + Number(log.sales_amount || 0), 0) || 0;

      // ---------------- SERVICE CHARGES (Deals + Sales Orders) ----------------

// 1) SERVICE CHARGES FROM SALES ORDERS
let serviceChargesSO = 0;

(salesOrderItems || []).forEach((it: any) => {
  const desc = (it.description || "").toLowerCase();

  const isService =
    desc.includes("charge") ||
    desc.includes("service") ||
    desc.includes("installation") ||
    desc.includes("delivery") ||
    desc.includes("transport") ||
    desc.includes("packaging");

  if (isService) {
    const taxable = Number(
      it.taxable_value ??
      (Number(it.unit_price || 0) * Number(it.quantity || 1))
    );

    serviceChargesSO += taxable;
  }
});




// 2) SERVICE CHARGES FROM DEALS (deal_items table)
let serviceChargesDeals = 0;



let dealGoodsRevenue = 0;

dealItems.forEach((it: any) => {
  const type = (it.products?.product_type || "").toLowerCase();

  const base = Number(
  it.taxable_value ??
  (Number(it.unit_price || 0) * Number(it.quantity || 1))
);

if (type === "goods") {
  dealGoodsRevenue += base;
}

});



// ---------------- DEAL TAX ----------------
let dealCGST = 0, dealSGST = 0, dealIGST = 0;

dealItems.forEach((it: any) => {
  const qty = Number(it.quantity || 1);
  const base = Number(it.taxable_value ?? (Number(it.unit_price || 0) * qty));

  const cgst = it.cgst_amount ?? (base * Number(it.cgst_percent || 0)) / 100;
  const sgst = it.sgst_amount ?? (base * Number(it.sgst_percent || 0)) / 100;
  const igst = it.igst_amount ?? (base * Number(it.igst_percent || 0)) / 100;

  dealCGST += cgst;
  dealSGST += sgst;
  dealIGST += igst;
});


// FINAL TOTAL TAX (SO + DEALS)
const totalTaxCollected =
  totalTaxCollectedFromItems +
  dealCGST + dealSGST + dealIGST;


dealItems.forEach((it: any) => {
  // Fallbacks for deals without product_id
  const type = (it.products?.product_type || it.product_type || it.item_type || "").toLowerCase();
  const name = (
    it.products?.name ||
    it.description ||
    it.item_name ||
    ""
  ).toLowerCase();

  // Improved detection
  const isDealService =
    type === "service" ||
    name.includes("service") ||
    name.includes("labour") ||
    name.includes("delivery") ||
    name.includes("charge");

  if (isDealService) {
    const qty = Number(it.quantity || 1);
    const taxable = Number(
      it.taxable_value ??
      (Number(it.unit_price || 0) * qty)
    );
    serviceChargesDeals += taxable;
  }
});



// FINAL TOTAL
const totalServiceCharges = serviceChargesSO + serviceChargesDeals;

// ======================================================
// FINAL PROFIT CALCULATION (DEALS + SALES ORDERS)
// ======================================================

// 1) PROFIT FROM SALES ORDERS (line-level)
// ======================================================
// FIXED: PROFIT FROM SALES ORDERS (goods profit + service profit separated)
// ======================================================
const salesOrderProfit = (() => {
  let goodsProfit = 0;
  let serviceProfit = 0;

  (salesOrderItems || []).forEach((it: any) => {
    const qty = Number(it.quantity || 1);
    const sell = Number(it.unit_price || 0);
    const cost = Number(it.products?.cost_price || 0);
    const type = (it.products?.product_type || "").toLowerCase();

    if (type === "goods") {
      goodsProfit += (sell - cost) * qty;
    } else {
      // service = full margin but SHOULD NOT pollute goods profit
      //serviceProfit += sell * qty;
    }
  });

  return Number((goodsProfit + serviceProfit).toFixed(2));
})();

// 🔽 APPLY SALES ORDER DISCOUNT TO PROFIT
const salesOrderProfitAfterDiscount =
  salesOrderProfit - totalSalesOrderDiscount;



// 2) PROFIT FROM DEALS (prefer expected_profit)
let dealsProfit = wonDeals.reduce(
  (sum: number, d: any) => sum + (Number(d.expected_profit) || 0),
  0
);

// fallback: if expected_profit is 0, compute from deal_items
if (!dealsProfit && (dealItems || []).length > 0) {
  let fallback = 0;
  (dealItems || []).forEach((it: any) => {
    const qty = Number(it.quantity || 1);
    const unit = Number(it.unit_price || 0);
    const cost = Number(it.products?.cost_price || 0);
    const type = (it.products?.product_type || "").toLowerCase();

    if (type === "goods") fallback += (unit - cost) * qty;
    else fallback += 0;
  });
  dealsProfit = Number(fallback.toFixed(2));
}

// 3) TOTAL PROFIT COMBINED
const combinedProfit = Number((salesOrderProfit + dealsProfit).toFixed(2));



      setReportData({
        summary: {
          totalLeads: leads.data?.length || 0,
          convertedLeads: convertedLeads.length,
          totalCustomers: customers.data?.length || 0,
          totalDeals: deals.data?.length || 0,
          wonDeals: wonDeals.length,
          lostDeals: lostDeals.length,
          activeDeals: activeDeals.length,

          // deals
          dealRevenue: dealGoodsRevenue,
          dealProfit: dealsProfit,
salesOrderProfit: Number(salesOrderProfitAfterDiscount.toFixed(2)),
totalProfit: Number(
  (salesOrderProfitAfterDiscount + dealsProfit).toFixed(2)
),


          
          serviceCharges: totalServiceCharges,


          // sales orders
          salesOrderRevenue: Number(salesOrderRevenueFromItems.toFixed(2)),



salesOrderDiscount: totalSalesOrderDiscount,


// total tax collected (CGST+SGST+IGST) from sales order items
taxCollected: totalTaxCollected,

          // --- FIXED SALES ORDER PROFIT ---













          

          completedOrders: completedOrders.length,
          pendingOrders: pendingOrders.length,
          conversionRate,
          totalExpenses,
          totalIncome,
          totalSales,
          totalCalls: calls.data?.length || 0,
          completedCalls: completedCalls.length,
          totalProducts: products.data?.length || 0,
        },

        leadsBySource: Object.entries(leadSourceCounts).map(([name, value]) => ({
          name: name ? name.replace("_", " ").toUpperCase() : "UNKNOWN",
          value,
        })),

        dealsByStage: Object.entries(dealStageCounts).map(([name, value]) => ({
          name: name ? name.replace("_", " ").toUpperCase() : "UNKNOWN",
          value,
        })),
        raw: { leads: leads.data, deals: deals.data, salesOrders: salesOrders.data, dailyLogs: dailyLogs.data },
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Error loading report data");
    } finally {
      setLoading(false);
      setTabLoading((t) => ({ ...t, overview: false }));
    }
  };

  const PremiumCard = ({ title, value, subtitle, icon, gradient }: any) => {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} text-white rounded-xl shadow-lg p-5 
        hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium opacity-90">{title}</p>
        <div className="opacity-90">{icon}</div>
      </div>

      <p className="text-3xl font-bold leading-tight drop-shadow-sm">
        {value}
      </p>

      {subtitle && (
        <p className="text-xs mt-1 opacity-90">{subtitle}</p>
      )}
    </div>
  );
};




  // Tab loaders
  const loadTabData = async (tab: TabKey) => {
    switch (tab) {
      case "overview":
  await fetchOverviewData();
  break;
      case "sales":
        await loadSalesAnalytics();
        break;
      case "finance":
        await loadFinanceAnalytics();
        break;
      case "inventory":
        await loadInventoryAnalytics();
        break;
      case "purchase_orders":
        await loadPurchaseOrderInsights();
        break;
      case "activities":
        await loadActivityStats();
        break;
      default:
        break;
    }
  };

  // SALES analytics
  const loadSalesAnalytics = async () => {
    setTabLoading((t) => ({ ...t, sales: true }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTabLoading((t) => ({ ...t, sales: false }));
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      const [leadsRes, dealsRes, salesOrdersRes, productsRes, customersRes] =
  await Promise.all([
    applyDateFilter(
      supabase.from("leads").select("*").eq("user_id", user.id),
      "created_at"
    ),

    applyDateFilter(
      supabase.from("deals").select("*").eq("user_id", user.id),
      "created_at"
    ),

    applyDateFilter(
      supabase.from("sales_orders").select("*").eq("user_id", user.id),
      "order_date"
    ),

    supabase.from("products").select("*").eq("user_id", user.id),
    supabase.from("customers").select("*").eq("user_id", user.id),
  ]);

  const validSalesOrders = (salesOrdersRes.data || []).filter(
  (o: any) =>
    o.status === "delivered" &&
    o.payment_status === "paid"
);

const validSalesOrderIds = validSalesOrders.map((o: any) => o.id);



      // ✅ sales order items ONLY for Delivered + Paid orders
let salesOrderItems: any[] = [];

if (validSalesOrderIds.length > 0) {
  const { data: items } = await supabase
    .from("sales_order_items")
    .select("*, products:products(product_type, cost_price)")
    .in("sales_order_id", validSalesOrderIds);

  salesOrderItems = items || [];
}


      const totalLeads = leadsRes.data?.length || 0;
      const contacted = leadsRes.data?.filter((l: any) => l.status === "contacted").length || 0;
      const qualified = leadsRes.data?.filter((l: any) => l.status === "qualified").length || 0;
      const totalDeals = dealsRes.data?.length || 0;
      const wonDeals = dealsRes.data?.filter((d: any) => d.stage === "closed_won").length || 0;

      setFunnelData([
        { name: "Leads", value: totalLeads },
        { name: "Contacted", value: contacted },
        { name: "Qualified", value: qualified },
        { name: "Deals", value: totalDeals },
        { name: "Won", value: wonDeals },
      ]);

      // monthly pipeline
      const pipelineMap: Record<string, number> = {};
      (dealsRes.data || []).forEach((d: any) => {
        const date = d.created_at ? new Date(d.created_at) : null;
        if (!date) return;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        pipelineMap[key] = (pipelineMap[key] || 0) + (Number(d.value) || 0);
      });
      const pipelineArr = Object.entries(pipelineMap)
        .map(([k, v]) => ({ month: k, value: v }))
        .sort((a, b) => (a.month > b.month ? 1 : -1));
      setMonthlyPipeline(pipelineArr);

      // product performance from sales items
      const products = (productsRes as any).data || [];
      const prodAgg: Record<string, { productId: string; units: number; revenue: number; name?: string; cost?: number }> =
        {};

      // ✅ Top Products = Delivered + Paid + GOODS only
(salesOrderItems || []).forEach((it: any) => {
  if ((it.products?.product_type || "").toLowerCase() !== "goods") return;
  if (!it.product_id) return;

  const pid = it.product_id;
  const qty = Number(it.quantity || 1);
  const price = Number(it.unit_price || 0);

  prodAgg[pid] ??= {
    productId: pid,
    units: 0,
    revenue: 0,
    name: undefined,
    cost: 0,
  };

  prodAgg[pid].units += qty;
  prodAgg[pid].revenue += qty * price;
});


      Object.values(prodAgg).forEach((p) => {
        const meta = products.find((x: any) => x.id === p.productId);
        if (meta) {
          p.name = meta.name;
          p.cost = Number(meta.cost_price || 0);
        }
      });

      const productPerformanceArr = Object.values(prodAgg)
        .map((p) => ({
          name: p.name || p.productId,
          units: p.units,
          revenue: p.revenue,
          estProfit: p.revenue - (p.cost || 0) * p.units,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setProductPerformance(productPerformanceArr);

      // revenue breakdown
      const revenueByMonthMap: Record<string, number> = {};
      const revenueByCustomerMap: Record<string, number> = {};
      const byProductTypeMap: Record<string, number> = {};

      // Build a map of orderId => order_date & order party (for customer grouping)
const orderDateMap: Record<string, string> = {};
const orderCustomerMap: Record<string, string> = {};
(validSalesOrders || []).forEach((o: any) => {
  const d = o.order_date ? new Date(o.order_date) : new Date(o.created_at || Date.now());
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  orderDateMap[o.id] = key;
  const cust = (o.party_type === "customer" ? o.party_id : null) || "unknown";
  orderCustomerMap[o.id] = cust;
});

// Use sales order items lines to compute actual revenue (exclude GST)
(salesOrderItems || []).forEach((it: any) => {
  const orderKey = orderDateMap[it.sales_order_id] || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
 // const lineTaxable = Number(it.taxable_value ?? (Number(it.unit_price || 0) * Number(it.quantity || 0)) || 0);
 const lineTaxable = Number(
  (it.taxable_value ?? (Number(it.unit_price || 0) * Number(it.quantity || 0))) || 0
);

  revenueByMonthMap[orderKey] = (revenueByMonthMap[orderKey] || 0) + lineTaxable;

  const custId = orderCustomerMap[it.sales_order_id] || "unknown";
  revenueByCustomerMap[custId] = (revenueByCustomerMap[custId] || 0) + lineTaxable;
});


      Object.values(prodAgg).forEach((p: any) => {
        const meta = products.find((x: any) => x.id === p.productId);
        const ptype = meta?.product_type || "goods";
        byProductTypeMap[ptype] = (byProductTypeMap[ptype] || 0) + p.revenue;
      });

      const revByMonthArr = Object.entries(revenueByMonthMap)
        .map(([k, v]) => ({ month: k, revenue: v }))
        .sort((a, b) => (a.month > b.month ? 1 : -1));

      const revByCustomerArr = Object.entries(revenueByCustomerMap)
        .map(([custId, total]) => {
          const c = customersRes.data?.find((x: any) => x.id && custId !== "unknown" && String(x.id) === String(custId));
          return {
            name: c?.name || "(Unknown Customer)",
            revenue: total,
          };
        })
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);

      const byProductTypeArr = Object.entries(byProductTypeMap).map(([t, v]) => ({ type: t, revenue: v }));

      setRevenueBreakdown({
        byMonth: revByMonthArr,
        byCustomer: revByCustomerArr,
        byProductType: byProductTypeArr,
      });
    } catch (err) {
      console.error("loadSalesAnalytics err", err);
      toast.error("Error loading Sales analytics");
    } finally {
      setTabLoading((t) => ({ ...t, sales: false }));
    }
  };

  // FINANCE analytics (per your rules)
  const loadFinanceAnalytics = async () => {
    setTabLoading((t) => ({ ...t, finance: true }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTabLoading((t) => ({ ...t, finance: false }));
        return;
      }

      // 1) Deals (won)
      const { data: deals } = await supabase
        .from("deals")
        .select("*")
        .eq("user_id", user.id)
        .eq("stage", "closed_won")
        .gte("created_at", startDate + "T00:00:00Z")
        .lte("created_at", endDate + "T23:59:59Z");

      // 2) Sales orders delivered & paid
      const { data: salesOrders } = await supabase
        .from("sales_orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "delivered")
        .eq("payment_status", "paid")
        .gte("order_date", startDate)
        .lte("order_date", endDate);

      // sales order items (outward GST)
      let salesItems: any[] = [];
      if (salesOrders && salesOrders.length > 0) {
        const orderIds = salesOrders.map((o: any) => o.id);
        const { data: sItems } = await supabase
  .from("sales_order_items")
  .select(`
    *,
    products:products(product_type, cost_price)
  `)
  .in("sales_order_id", orderIds);

        salesItems = sItems || [];
      }

      // 3) Purchase orders (received)
      const { data: purchaseOrders } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "received")
        .eq("payment_status", "paid")
        .gte("order_date", startDate)
        .lte("order_date", endDate);

      // purchase order items (inward GST)
      let poItems: any[] = [];
      if (purchaseOrders && purchaseOrders.length > 0) {
        const poIds = purchaseOrders.map((p: any) => p.id);
        const { data: pItems } = await supabase
          .from("purchase_order_items")
          .select("*")
          .in("purchase_order_id", poIds);
        poItems = pItems || [];
      }

      // 4) Daily logs (still included in expenses)
      const { data: dailyLogs } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", startDate)
        .lte("log_date", endDate);

      // ------- Income calculation -------
      // ------- Income calculation -------
// dealsIncome: from won deals (existing)
const dealsIncome = (deals || []).reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0);

// soIncome: compute from sales order items (line taxable values) — exclude GST
const soIncome = (salesItems || []).reduce((sum: number, it: any) => {
 // const lineTaxable = Number(it.taxable_value ?? (Number(it.unit_price || 0) * Number(it.quantity || 0)) || 0);
 const lineTaxable = Number(
  (it.taxable_value ?? (Number(it.unit_price || 0) * Number(it.quantity || 0))) || 0
);

  return sum + lineTaxable;
}, 0);

const totalIncome = dealsIncome + soIncome;


      // ------- Expense calculation -------
      const expenseFromLogs = (dailyLogs || []).reduce((s: number, l: any) => s + Number(l.expense_amount || 0), 0);
      const expenseFromPO = (purchaseOrders || []).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0);
      const totalExpense = expenseFromLogs + expenseFromPO;

      // ------- GST calculations -------
      let outwardCGST = 0;
      let outwardSGST = 0;
      let outwardIGST = 0;

      (salesItems || []).forEach((it: any) => {
        outwardCGST += Number(it.cgst_amount || 0);
        outwardSGST += Number(it.sgst_amount || 0);
        outwardIGST += Number(it.igst_amount || 0);
      });

      // maybe there's a deal_items table with cgst_percent/sgst_percent
      let dealItems: any[] = [];
      if (deals && deals.length > 0) {
        const dealIds = deals.map((d: any) => d.id);
        const { data: dItems } = await supabase
          .from("deal_items")
          .select("*")
          .in("deal_id", dealIds);
        dealItems = dItems || [];
      }

      (dealItems || []).forEach((it: any) => {
        const qty = Number(it.quantity || 1);
        const unit = Number(it.unit_price || it.price || 0);
        const amount = qty * unit;
        const cgstPct = Number(it.cgst_percent || 0);
        const sgstPct = Number(it.sgst_percent || 0);
        const igstPct = Number(it.igst_percent || 0);

        outwardCGST += (amount * cgstPct) / 100;
        outwardSGST += (amount * sgstPct) / 100;
        outwardIGST += (amount * igstPct) / 100;
      });

      // Inward GST
      const inwardGST = (poItems || []).reduce((s: number, it: any) => s + Number(it.tax_amount || 0), 0);

      // net payable
      const outwardTotal = outwardCGST + outwardSGST + outwardIGST;
      const net_payable = outwardTotal - inwardGST;

      const gstSummary = {
        outward: {
          CGST: Number(outwardCGST.toFixed(2)),
          SGST: Number(outwardSGST.toFixed(2)),
          IGST: Number(outwardIGST.toFixed(2)),
          Total: Number(outwardTotal.toFixed(2)),
        },
        inward: {
          GST: Number(inwardGST.toFixed(2)),
        },
        net_payable: Number(net_payable.toFixed(2)),
      };

      // Profit margin %
      const grossProfit = totalIncome - totalExpense;
      const profitMarginPercent = totalIncome > 0 ? Number(((grossProfit / totalIncome) * 100).toFixed(2)) : 0;

      // Top purchased (kept small — but moved to PO component if you want)
      const topPurchasedProducts = Object.entries(
        (poItems || []).reduce((acc: any, it: any) => {
          const key = it.description || it.product_name || "Unknown";
          acc[key] = (acc[key] || 0) + Number((it.unit_price || 0) * (it.quantity || 1));
          return acc;
        }, {})
      )
        .map(([name, total]) => ({ name, total }))
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 5);

      // Daily profit series
      //const dailyMap: Record<string, { date: string; net: number }> = {};
      const dailyMap: Record<
  string,
  {
    date: string;
    revenue: number;
    expense: number;
    profit: number;
  }
> = {};
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
        const key = new Date(d).toISOString().split("T")[0];
        dailyMap[key] = {
  date: key,
  revenue: 0,
  expense: 0,
  profit: 0,
};

      }

      (dailyLogs || []).forEach((l: any) => {
  const key = l.log_date;
  if (!dailyMap[key]) return;

  dailyMap[key].expense += Number(l.expense_amount || 0);
});


      // Build order date mapping
const orderDateMapFinance: Record<string, string> = {};
(salesOrders || []).forEach((o: any) => {
  const d = o.order_date ? new Date(o.order_date) : new Date(o.created_at || Date.now());
  orderDateMapFinance[o.id] =
  (o.order_date || o.created_at || "").split("T")[0];

});

// Add sales items to daily map using taxable values (exclude GST)
(salesItems || []).forEach((it: any) => {
  const orderDateKey = orderDateMapFinance[it.sales_order_id] || new Date().toISOString().split("T")[0];
  //if (!dailyMap[orderDateKey]) dailyMap[orderDateKey] = { date: orderDateKey, net: 0 };
  //const lineTaxable = Number(it.taxable_value ?? (Number(it.unit_price || 0) * Number(it.quantity || 0)) || 0);
  const lineTaxable = Number(
  (it.taxable_value ?? (Number(it.unit_price || 0) * Number(it.quantity || 0))) || 0
);

  dailyMap[orderDateKey].revenue += lineTaxable;
});

// ---------------- DAILY SALES ORDER PROFIT ----------------
const dailySalesProfitMap: Record<string, number> = {};

(salesItems || []).forEach((it: any) => {
  const type = (it.products?.product_type || "").toLowerCase();
  if (type !== "goods") return;

  const qty = Number(it.quantity || 1);
  const sell = Number(it.unit_price || 0);
  const cost = Number(it.products?.cost_price || 0);

  const profit = (sell - cost) * qty;
  if (profit === 0) return;

  const order = salesOrders.find((o: any) => o.id === it.sales_order_id);
  if (!order) return;

  const rawDate = order.order_date || order.created_at;
if (!rawDate) return;

const dateKey = rawDate.split("T")[0];


if (!dailyMap[dateKey]) return;


  dailySalesProfitMap[dateKey] =
    (dailySalesProfitMap[dateKey] || 0) + profit;
});


(deals || []).forEach((d: any) => {
  const key = new Date(d.created_at).toISOString().split("T")[0];
  if (!dailyMap[key]) return;

  dailyMap[key].revenue += Number(d.value || 0);
});

// ---------------- DAILY DEAL PROFIT ----------------
const dailyDealProfitMap: Record<string, number> = {};

(deals || []).forEach((d: any) => {
  const profit = Number(d.expected_profit || 0);
  if (!profit) return;

  //const dateKey = new Date(d.created_at).toISOString().split("T")[0];
  const rawDate = d.created_at;
if (!rawDate) return;

const dateKey = rawDate.split("T")[0];


if (!dailyMap[dateKey]) return;

  dailyDealProfitMap[dateKey] =
    (dailyDealProfitMap[dateKey] || 0) + profit;
});




      (purchaseOrders || []).forEach((p: any) => {
  const rawDate =
    p.order_date ||
    p.created_at ||
    new Date().toISOString();

  //const key = new Date(rawDate).toISOString().split("T")[0];
  const key = rawDate.split("T")[0];

  if (!dailyMap[key]) return;

  // PO is EXPENSE
  dailyMap[key].expense += Number(p.total_amount || 0);
});

// ---------------- APPLY TRUE PROFIT (CARD LOGIC) ----------------
Object.values(dailyMap).forEach((d: any) => {
  const soProfit = dailySalesProfitMap[d.date] || 0;
  const dealProfit = dailyDealProfitMap[d.date] || 0;

  d.profit = Number((soProfit + dealProfit).toFixed(2));
});




      const dailyProfitArr = Object.values(dailyMap).sort((a: any, b: any) => (a.date > b.date ? 1 : -1));

      // set finance data
      setFinanceData({
        totalIncome,
        dealsIncome,
        soIncome,
        totalExpense,
        expenseFromLogs,
        expenseFromPO,
        grossProfit,
        profitMarginPercent,
        netCashFlow: totalIncome - totalExpense,
        gstSummary,
        topPurchasedProducts,
        dailyProfit: dailyProfitArr,
      });
    } catch (e) {
      console.error("Finance Analytics failed", e);
      toast.error("Finance analytics failed");
    } finally {
      setTabLoading((t) => ({ ...t, finance: false }));
    }
  };

  // INVENTORY analytics
  const loadInventoryAnalytics = async () => {
    setTabLoading((t) => ({ ...t, inventory: true }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTabLoading((t) => ({ ...t, inventory: false }));
        return;
      }

      // fetch products
      const { data: products } = await supabase.from("products").select("*").eq("user_id", user.id);

      // sales orders (delivered) -> out
      const { data: salesOrders } = await supabase
  .from("sales_orders")
  .select("*")
  .eq("user_id", user.id)
  .in("status", ["shipped", "delivered"])
  .gte("order_date", startDate)
  .lte("order_date", endDate);


      const soldItems: any[] = [];
      if (salesOrders?.length) {
        const ids = salesOrders.map((s: any) => s.id);
        const { data: sItems } = await supabase
          .from("sales_order_items")
          .select("*")
          .in("sales_order_id", ids);
        soldItems.push(...(sItems || []));
      }

      // purchase orders (received) -> in
      const { data: purchaseOrders } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "received")
        .gte("order_date", startDate)
        .lte("order_date", endDate);

      const receivedItems: any[] = [];
      if (purchaseOrders?.length) {
        const ids = purchaseOrders.map((p: any) => p.id);
        const { data: pItems } = await supabase
          .from("purchase_order_items")
          .select("*")
          .in("purchase_order_id", ids);
        receivedItems.push(...(pItems || []));
      }

      // top sold products

      const soldAgg: Record<
  string,
  { name: string; units: number; revenue: number }
> = {};

      const EXCLUDED_SERVICE_KEYWORDS = [
  "installation charge",
  "delivery charge",
  "transport charge",
  "packing",
  "packaging charge",
  "loading",
  "unloading",
  "labour",
  "labor",
  "other service",
  "charges",
];

const isExcludedServiceCharge = (name: string) => {
  const n = name.toLowerCase();
  return EXCLUDED_SERVICE_KEYWORDS.some(k => n.includes(k));
};

      (soldItems || []).forEach((it: any) => {
  const name = it.product_name || it.description || "Unknown";
  if (isExcludedServiceCharge(name)) return;

  const qty = Number(it.quantity || 0);
  const revenue = Number(it.unit_price || 0) * qty;

  soldAgg[name] ??= { name, units: 0, revenue: 0 };
  soldAgg[name].units += qty;
  soldAgg[name].revenue += revenue;
});


      

      // ---- INCLUDE DEAL ITEMS (CLOSED WON) ----
const { data: wonDeals } = await supabase
  .from("deals")
  .select("id")
  .eq("user_id", user.id)
  .eq("stage", "closed_won");

if (wonDeals?.length) {
  const dealIds = wonDeals.map((d: any) => d.id);

  const { data: dealItems } = await supabase
    .from("deal_items")
    .select("*, products:products(name, product_type)")
    .in("deal_id", dealIds);

  (dealItems || []).forEach((it: any) => {
    const name =
      it.products?.name ||
      it.description ||
      it.item_name ||
      "Unknown";

    if (isExcludedServiceCharge(name)) return;

    const qty = Number(it.quantity || 1);
    const revenue = Number(it.unit_price || 0) * qty;

    soldAgg[name] ??= { name, units: 0, revenue: 0 };
    soldAgg[name].units += qty;
    soldAgg[name].revenue += revenue;
  });
}
const topSold = Object.values(soldAgg)
      
        .sort((a, b) => b.units - a.units)
        .slice(0, 10);


      // items in / out by day for last 30 days
      const days = 30;
      const dayMap: Record<string, { date: string; in: number; out: number }> = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dayMap[key] = { date: key, in: 0, out: 0 };
      }
      (receivedItems || []).forEach((it: any) => {
  const isService =
    (it.product_type || "").toLowerCase() === "service" ||
    (it.description || "").toLowerCase().includes("charge");

  if (isService) return;

  const key =
    (it.received_date ||
      it.order_date ||
      it.created_at ||
      new Date().toISOString()
    ).split("T")[0];

  if (!dayMap[key]) dayMap[key] = { date: key, in: 0, out: 0 };
  dayMap[key].in += Number(it.quantity || 0);
});

      (soldItems || []).forEach((it: any) => {
  const isService =
    (it.product_type || "").toLowerCase() === "service" ||
    (it.description || "").toLowerCase().includes("charge");

  if (isService) return; // ✅ ignore service charges

  const rawDate =
    it.shipped_date ||
    it.order_date ||
    it.updated_at ||
    it.created_at;

  if (!rawDate) return;

  const key = new Date(rawDate).toISOString().split("T")[0];

  if (!dayMap[key]) return;

  dayMap[key].out += Number(it.quantity || 0);
});



      // ---------- LAST SOLD DATE PER PRODUCT ----------



      const trend = Object.values(dayMap).sort((a: any, b: any) => (a.date > b.date ? 1 : -1));

      // ---------- LAST SOLD DATE (SALES ORDERS + DEALS) ----------
const lastSoldMap: Record<string, Date> = {};

// 1️⃣ FROM SALES ORDERS
(soldItems || []).forEach((it: any) => {
  const key =
    it.product_id ||
    it.product_name ||
    it.description;

  if (!key) return;

  const rawDate =
    it.shipped_date ||
    it.order_date ||
    it.created_at ||
    new Date().toISOString();

  const date = new Date(rawDate);

  if (!lastSoldMap[key] || date > lastSoldMap[key]) {
    lastSoldMap[key] = date;
  }
});

// 2️⃣ FROM CLOSED-WON DEAL ITEMS
if (wonDeals?.length) {
  const dealIds = wonDeals.map((d: any) => d.id);

  const { data: dealItemsForSlow } = await supabase
    .from("deal_items")
    .select("*, products:products(id, name)")
    .in("deal_id", dealIds);

  (dealItemsForSlow || []).forEach((it: any) => {
    const key =
      it.product_id ||
      it.products?.id ||
      it.products?.name ||
      it.item_name ||
      it.description;

    if (!key) return;

    const rawDate =
      it.updated_at ||
      it.created_at ||
      new Date().toISOString();

    const date = new Date(rawDate);

    if (!lastSoldMap[key] || date > lastSoldMap[key]) {
      lastSoldMap[key] = date;
    }
  });
}


      // stock value & reorder alerts
      const productList = products || [];
      const arr = productList.map((p: any) => ({
        id: p.id,
        name: p.name,
        qty: Number(p.quantity_in_stock || 0),
        reorder_level: Number(p.reorder_level || 0),
        unit_price: Number(p.unit_price || 0),
        cost_price: Number(p.cost_price || 0),
      }));

     // const low = arr.filter((p) => p.qty <= p.reorder_level).sort((a, b) => a.qty - b.qty);

     const REORDER_THRESHOLD = 15;

const low = arr
  .filter((p) => p.qty < REORDER_THRESHOLD)
  .sort((a, b) => a.qty - b.qty);


      const totalStockValue = arr.reduce((sum, p) => sum + p.qty * (p.cost_price || p.unit_price || 0), 0);

      // PO and SO totals (counts & amounts)
      const poSummary = {
        count: (purchaseOrders || []).length,
        totalAmount: (purchaseOrders || []).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0),
      };
      const soSummary = {
        count: (salesOrders || []).length,
        totalAmount: (salesOrders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0),
      };

      const totalIn = (receivedItems || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);
      //const totalOut = (soldItems || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);
      const totalOut = (soldItems || []).reduce(
  (s: number, it: any) => {
    const isService =
      (it.product_type || "").toLowerCase() === "service" ||
      (it.description || "").toLowerCase().includes("charge");

    if (isService) return s; // ✅ ignore services

    return s + Number(it.quantity || 0);
  },
  0
);


      setLowStock(low);
      setStockValue(totalStockValue);
      setInventoryOverview({
        topSold,
        trend,
        totalIn,
        totalOut,
        poSummary,
        soSummary,
        totalStockValue,
        products: arr,
      });

      // ---------- SLOW MOVING CALCULATION ----------
const today = new Date();

const slowMoving = arr
  .filter(p => p.qty > 0)
  .map(p => {
    const lastSold =
      lastSoldMap[p.id] ||
      lastSoldMap[p.name];

    const days = lastSold
      ? Math.floor((today.getTime() - lastSold.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      name: p.name,
      days,
    };
  })
  .sort((a, b) => b.days - a.days)
  .slice(0, 10);




      setInventoryData({
  totalValue: totalStockValue,                      // stock valuation
  totalUnits: arr.reduce((sum, p) => sum + p.qty, 0),

  itemsIn30d: totalIn,                              // items received in range
  itemsOut30d: totalOut,                            // items sold in range

  reorderCount: low.length,                         // low stock alerts
  stockTrend: trend,                                 // movement graph
  topSold: topSold,                                  // top sold products

  slowMoving,
});
    } catch (err) {
      console.error("loadInventoryAnalytics err", err);
      toast.error("Error loading Inventory analytics");
      
    } finally {
      setTabLoading((t) => ({ ...t, inventory: false }));
    }
  };

  // Purchase Order Insights
  const loadPurchaseOrderInsights = async () => {
  setTabLoading((t) => ({ ...t, purchase_orders: true }));

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1) Fetch POs
    const { data: pos } = await supabase
  .from("purchase_orders")
  .select("*")
  .eq("user_id", user.id)
  .gte("order_date", startDate)
  .lte("order_date", endDate);



    // 2) Fetch PO items
    let poItems: any[] = [];
    if (pos?.length) {
      const ids = pos.map((p: any) => p.id);
      const { data: items } = await supabase
        .from("purchase_order_items")
        .select("*")
        .in("purchase_order_id", ids);

      poItems = items || [];
    }

    // -------------------------
    // SUMMARY CARDS
    // -------------------------
    const totalPOs = pos?.length || 0;
    //const totalSpend = pos?.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    // 💰 ACTUAL SPEND = only received + paid POs
const totalSpend = pos
  ?.filter(
    (p: any) =>
      p.status === "received" &&
      p.payment_status === "paid"
  )
  .reduce(
    (s: number, p: any) => s + Number(p.total_amount || 0),
    0
  ) || 0;

    //const avgPOValue = totalPOs > 0 ? totalSpend / totalPOs : 0;
    const paidPOCount =
  pos?.filter(
    (p: any) =>
      p.status === "received" &&
      p.payment_status === "paid"
  ).length || 0;

const avgPOValue =
  paidPOCount > 0 ? totalSpend / paidPOCount : 0;


    const vendorSet = new Set(pos?.map((p: any) => p.vendor_id)?.filter(Boolean));
    const vendorCount = vendorSet.size;

    // -------------------------
    // STATUS BREAKDOWN
    // -------------------------
    const statusSummary = {
  draft: pos?.filter((p: any) => p.status === "draft").length || 0,
  pending: pos?.filter((p: any) => p.status === "pending").length || 0,
  approved: pos?.filter((p: any) => p.status === "approved").length || 0,
  received: pos?.filter((p: any) => p.status === "received").length || 0,
  cancelled: pos?.filter((p: any) => p.status === "cancelled").length || 0,
};


    // -------------------------
    // VENDOR TOTALS
    // -------------------------
    const vendorMap: Record<string, number> = {};
    pos?.forEach((p: any) => {
      const id = p.vendor_id || "unknown";
      vendorMap[id] = (vendorMap[id] || 0) + Number(p.total_amount || 0);
    });

    const vendorIds = Object.keys(vendorMap).filter((i) => i !== "unknown");
    const { data: vendors } =
      vendorIds.length > 0
        ? await supabase.from("vendors").select("*").in("id", vendorIds)
        : { data: [] };

    const vendorTotals = Object.entries(vendorMap).map(([id, total]) => {
      const v = vendors?.find((x) => x.id === id);
      return { name: v?.name || "Unknown Vendor", total };
    });

    // -------------------------
    // MONTHLY TOTALS
    // -------------------------
    const monthMap: Record<string, number> = {};
    pos?.forEach((p: any) => {
      const d = new Date(p.order_date || p.created_at || new Date());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + Number(p.total_amount || 0);
    });

    const monthlyPOs = Object.entries(monthMap).map(([month, total]) => ({
      month,
      total,
    }));

    // -------------------------
    // TOP PURCHASED PRODUCTS
    // -------------------------
    const topProducts = Object.entries(
      poItems.reduce((acc: any, it: any) => {
        const name = it.product_name || it.description || "Unknown";
        acc[name] = (acc[name] || 0) + Number(it.quantity || 0);
        return acc;
      }, {})
    )
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // -------------------------
    // DAILY PURCHASE TREND
    // -------------------------
    const dailyMap: Record<string, number> = {};

poItems.forEach((it: any) => {
  const rawDate =
    it.received_date ||
    it.order_date ||
    it.created_at ||            // fallback 1
    new Date().toISOString();   // fallback 2 (guaranteed safe)

  const key = new Date(rawDate).toISOString().split("T")[0];

  dailyMap[key] = (dailyMap[key] || 0) + Number(it.quantity || 0);
});


    const dailyTrend = Object.entries(dailyMap).map(([date, qty]) => ({
      date,
      qty,
    }));

    // -------------------------
    // SET ALL INSIGHTS
    // -------------------------
    setPoInsights({
      summary: {
        totalPOs,
        totalSpend,
        avgPOValue,
        vendorCount,
      },
      statusSummary,
      vendorTotals,
      monthlyPOs,
      topProducts,
      dailyTrend,
    });
  } catch (err) {
    console.error(err);
    toast.error("Error loading purchase order insights");
  } finally {
    setTabLoading((t) => ({ ...t, purchase_orders: false }));
  }
};


  // Activity stats
  const loadActivityStats = async () => {
    setTabLoading((t) => ({ ...t, activities: true }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTabLoading((t) => ({ ...t, activities: false }));
        return;
      }

      let q = supabase
  .from("activities")
  .select("*")
  .eq("user_id", user.id);

  

if (useDateFilter && startDate && endDate) {
  q = q
    .gte("created_at", startDate + "T00:00:00Z")
    .lte("created_at", endDate + "T23:59:59Z");
}

const { data: acts } = await q;

// --------- FETCH ONLINE TIME (USER SESSIONS) ----------
let onlineMinutes = 0;

const sessionsQuery = (supabase as any)
  .from("user_sessions")
  .select("total_seconds")
  .eq("user_id", user.id);




if (useDateFilter && startDate && endDate) {
  (sessionsQuery as any)
    .gte("session_date", startDate)
    .lte("session_date", endDate);
}


const { data: sessions } = await sessionsQuery;

onlineMinutes = (sessions || []).reduce(
  (sum: number, s: any) => sum + Math.floor((s.total_seconds || 0) / 60),
  0
);





      const typeMap: Record<string, number> = {};
      const dailyMap: Record<string, number> = {};
      const dailyMinutesMap: Record<string, number> = {};


      let totalMinutes = 0;
let productiveMinutes = 0;
let completedCount = 0;
let overloadDays = 0;




      (acts || []).forEach((a: any) => {
  const type = a.activity_type || "unknown";
  const minutes = Number(a.duration_minutes || 0);
  const status = a.status || "completed";

  // Count by type
  typeMap[type] = (typeMap[type] || 0) + 1;

  // Daily count
  const d = a.created_at
    ? new Date(a.created_at).toISOString().split("T")[0]
    : null;
  if (d) dailyMap[d] = (dailyMap[d] || 0) + 1;

  // Time calculations
  totalMinutes += minutes;

  if (["call", "meeting", "follow_up", "deal_update"].includes(type)) {
    productiveMinutes += minutes;
  }

  if (status === "completed") {
    completedCount += 1;
  }

  if (d) {
  dailyMinutesMap[d] = (dailyMinutesMap[d] || 0) + minutes;
}

if (minutes > 480) { // more than 8 hours in a day
  overloadDays += 1;
}


});

const totalActivities = acts?.length || 0;
const completionRate =
  totalActivities > 0
    ? Math.round((completedCount / totalActivities) * 100)
    : 0;

const focusIndex =
  totalMinutes > 0
    ? Math.round((productiveMinutes / totalMinutes) * 100)
    : 0;

const productivityScore = Math.min(
  100,
  Math.round(
    completionRate * 0.4 +
    focusIndex * 0.4 +
    (totalMinutes > 0 ? 20 : 0)
  )
);



      const byType = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
      const byDaily = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      setActivityStats({
  byType,
  daily: byDaily,
  dailyMinutes: Object.entries(dailyMinutesMap).map(([date, minutes]) => ({
    date,
    minutes,
  })),
  totalMinutes,
  productiveMinutes,
  completionRate,
  focusIndex,
  productivityScore,
  overloadDays,
  onlineMinutes,
});



    } catch (err) {
      console.error("loadActivityStats err", err);
      toast.error("Error loading Activity stats");
    } finally {
      setTabLoading((t) => ({ ...t, activities: false }));
    }
  };

  // small helper UI loader
  const isAnyLoading = loading || Object.values(tabLoading).some(Boolean);

  // derived metrics
  const conversionRate =
    reportData?.summary.totalLeads > 0
      ? ((reportData.summary.convertedLeads / reportData.summary.totalLeads) * 100).toFixed(1)
      : "0.0";

  const winRate =
    reportData?.summary.totalDeals > 0
      ? ((reportData.summary.wonDeals / reportData.summary.totalDeals) * 100).toFixed(1)
      : "0.0";

  const callCompletionRate =
    reportData?.summary.totalCalls > 0
      ? ((reportData.summary.completedCalls / reportData.summary.totalCalls) * 100).toFixed(1)
      : "0.0";

  const productivityLabel =
  activityStats.productivityScore >= 75 ? "High" :
  activityStats.productivityScore >= 45 ? "Medium" : "Low";

const productivityColor =
  activityStats.productivityScore >= 75 ? "text-emerald-600" :
  activityStats.productivityScore >= 45 ? "text-amber-600" :
  "text-rose-600";


  // Download helper
  const downloadReportAsImage = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, logging: false, useCORS: true });
      const link = document.createElement("a");
      link.download = `crm-report-${startDate}-to-${endDate}.png`;
      link.href = canvas.toDataURL();
      link.click();
      toast.success("Report downloaded as image!");
    } catch (error) {
      toast.error("Error downloading report");
    }
  };

  



  // ---------- RENDER ----------
  // ---------- RENDER ----------
  return (
    <div className="bg-slate-50/50 min-h-screen font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
              CRM Reports & Analytics
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Enterprise insights • Real-time data • Actionable metrics
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex gap-3 items-center px-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From</Label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="h-9 w-full sm:w-36 text-sm border-slate-200 focus:ring-indigo-500 bg-slate-50" 
              />
            </div>

            <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>

            <div className="flex gap-3 items-center px-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</Label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setUseDateFilter(true);
                }}
                className="h-9 w-full sm:w-36 text-sm border-slate-200 focus:ring-indigo-500 bg-slate-50" 
              />
            </div>

            <Button 
              onClick={downloadReportAsImage} 
              disabled={isAnyLoading} 
              className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="text-xs font-semibold">Export</span>
            </Button>
          </div>
        </div>

        {/* Tabs - Segmented Control Style */}
        <div className="relative bg-slate-50/95 py-2">
          <div className="inline-flex p-1 rounded-lg bg-white border border-slate-200 shadow-sm overflow-x-auto max-w-full">
            <TabButton label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
            <TabButton label="Sales Analytics" active={activeTab === "sales"} onClick={() => setActiveTab("sales")} />
            <TabButton label="Finance" active={activeTab === "finance"} onClick={() => setActiveTab("finance")} />
            <TabButton label="Inventory" active={activeTab === "inventory"} onClick={() => setActiveTab("inventory")} />
            <TabButton label="Purchase Orders" active={activeTab === "purchase_orders"} onClick={() => setActiveTab("purchase_orders")} />
            <TabButton label="Activities" active={activeTab === "activities"} onClick={() => setActiveTab("activities")} />
          </div>
        </div>


        {/* Body */}
        <div ref={reportRef} className="space-y-6">

          {/* ---------------------- PREMIUM OVERVIEW UI ---------------------- */}
          {/* ---------------------- PREMIUM OVERVIEW UI ---------------------- */}
{activeTab === "overview" && (
  <>
    {loading ? (
      <div className="flex h-64 items-center justify-center text-slate-400 font-medium animate-pulse">
        Loading dashboard data...
      </div>
    ) : (
      reportData && (
        
        <>
          {/* --------------------------------------------- */}
          {/* KPI GRID (10 Cards - Auto Flow)               */}
          {/* --------------------------------------------- */}

          <div className="flex justify-end mb-4">

</div>

{aiData && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
    <Card className="border-indigo-200 bg-indigo-50">
      <CardHeader>
        <CardTitle>AI Summary</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-700">
        {aiData.summary}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Key Insights</CardTitle></CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {aiData.insights?.map((i: string, idx: number) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card className="border-rose-200 bg-rose-50">
      <CardHeader><CardTitle>Risks</CardTitle></CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-1 text-sm text-rose-700">
          {aiData.risks?.map((r: string, idx: number) => (
            <li key={idx}>{r}</li>
          ))}
        </ul>
      </CardContent>
    </Card>

    <Card className="border-emerald-200 bg-emerald-50">
      <CardHeader><CardTitle>Recommended Actions</CardTitle></CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-1 text-sm text-emerald-700">
          {aiData.actions?.map((a: string, idx: number) => (
            <li key={idx}>{a}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  </div>
)}


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* 1. Total Leads */}
            <KPICard 
              title="Total Leads" 
              value={reportData.summary.totalLeads} 
              subtext={`${reportData.summary.convertedLeads} converted • ${conversionRate}%`}
              icon={<Target className="h-5 w-5 text-indigo-600" />}
              colorClass="bg-indigo-50"
            />

            {/* 2. Customers */}
            <KPICard 
              title="Customers" 
              value={reportData.summary.totalCustomers} 
              subtext="Total active accounts"
              icon={<Users className="h-5 w-5 text-emerald-600" />}
              colorClass="bg-emerald-50"
            />

            {/* 3. Deals Won */}
            <KPICard 
              title="Deals Won" 
              value={reportData.summary.wonDeals} 
              subtext={`Active: ${reportData.summary.activeDeals} • Win: ${winRate}%`}
              icon={<TrendingUp className="h-5 w-5 text-rose-600" />}
              colorClass="bg-rose-50"
            />

            {/* 4. Deal Revenue */}
            <KPICard 
              title="Deal Revenue" 
              value={`₹${Number(reportData.summary.dealRevenue).toLocaleString("en-IN")}`} 
              subtext="Closed-won value"
              icon={<DollarSign className="h-5 w-5 text-amber-600" />}
              colorClass="bg-amber-50"
            />

            {/* 5. Sales Order Revenue */}
            <KPICard 
              title="Sales Order Rev" 
              value={`₹${reportData.summary.salesOrderRevenue.toLocaleString("en-IN")}`} 
              subtext="Delivered + Paid"
              icon={<ShoppingBag className="h-5 w-5 text-blue-600" />}
              colorClass="bg-blue-50"
            />

            {/* 6. Tax Collected */}
            <KPICard 
              title="Tax Collected" 
              value={`₹${(reportData.summary.taxCollected || 0).toLocaleString("en-IN")}`} 
              subtext="CGST + SGST + IGST"
              icon={<FileText className="h-5 w-5 text-yellow-600" />}
              colorClass="bg-yellow-50"
            />

            {/* 7. Total Profit */}
            <KPICard 
              title="Total Profit" 
              value={`₹${reportData.summary.totalProfit.toLocaleString("en-IN")}`} 
              subtext="Based on cost price"
              icon={<PieChart className="h-5 w-5 text-red-600" />}
              colorClass="bg-red-50"
            />

            {/* 8. Service Charges (Restored) */}
            <KPICard 
              title="Service Charges" 
              value={`₹${reportData.summary.serviceCharges.toLocaleString("en-IN")}`} 
              subtext="Deals + Sales Orders"
              icon={<Zap className="h-5 w-5 text-purple-600" />}
              colorClass="bg-purple-50"
            />

            <KPICard 
  title="Sales Order Discount" 
  value={`₹${(reportData.summary.salesOrderDiscount || 0).toLocaleString("en-IN")}`} 
  subtext="Discount given on orders"
  icon={<Percent className="h-5 w-5 text-rose-600" />}
  colorClass="bg-rose-50"
/>


            {/* 9. Daily Log Expense (Restored) */}
            <KPICard 
              title="Daily Log Expense" 
              value={`₹${reportData.summary.totalExpenses.toLocaleString("en-IN")}`} 
              subtext="Expenses from logs"
              icon={<TrendingDown className="h-5 w-5 text-slate-600" />}
              colorClass="bg-slate-100"
            />

            {/* 10. Calls Summary */}
            <KPICard 
              title="Calls Summary" 
              value={reportData.summary.totalCalls} 
              subtext={`Completed: ${reportData.summary.completedCalls} (${callCompletionRate}%)`}
              icon={<Phone className="h-5 w-5 text-sky-600" />}
              colorClass="bg-sky-50"
            />

          </div>

          {/* --------------------------------------------- */}
          {/* CHARTS — Lead Source + Deal Stage             */}
          {/* --------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

            {/* Leads by Source */}
            <ChartContainer title="Leads by Source">
              {reportData.leadsBySource?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.leadsBySource}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                    >
                      {reportData.leadsBySource.map((_: any, index: number) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" iconType="circle" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </ChartContainer>

            {/* Deals by Stage */}
            <ChartContainer title="Deals by Stage">
              {reportData.dealsByStage?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.dealsByStage} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      angle={-20} 
                      textAnchor="end" 
                      height={60} 
                      tick={{fontSize: 12, fill: '#64748b'}} 
                      interval={0} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {reportData.dealsByStage.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </ChartContainer>

          </div>
        </>
      )
    )}
  </>
)}

          {/* ---------------------- PREMIUM SALES UI ---------------------- */}
          {activeTab === "sales" && (
            <>
              {tabLoading.sales ? (
                <div className="flex h-64 items-center justify-center text-slate-400 font-medium animate-pulse">Loading sales data...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
                    <KPICard
  title="Sales Orders"
  value={
  reportData?.raw?.salesOrders?.filter(
    (o: any) => o.status === "delivered"
  ).length || 0
}

  subtext="Delivered orders (filtered)"
  icon={<ShoppingBag className="h-5 w-5 text-indigo-600" />}
  colorClass="bg-indigo-50"
/>

                    <KPICard title="Deals Created" value={funnelData[3]?.value || 0} subtext="Pipeline entries" icon={<PlusCircle className="h-5 w-5 text-blue-600"/>} colorClass="bg-blue-50" />
                    <KPICard title="Deals Won" value={funnelData[4]?.value || 0} subtext="Converted" icon={<CheckCircle className="h-5 w-5 text-emerald-600"/>} colorClass="bg-emerald-50" />
                    <KPICard title="Total Revenue" value={`₹${((reportData?.summary?.dealRevenue || 0) + (reportData?.summary?.salesOrderRevenue || 0)).toLocaleString("en-IN")}`} subtext="Deals + Orders" icon={<Banknote className="h-5 w-5 text-amber-600"/>} colorClass="bg-amber-50" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sales Funnel */}
                    <ChartContainer title="Sales Funnel">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={[...funnelData].reverse()} barSize={30}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {funnelData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>

                    {/* Monthly Pipeline Trend */}
                    <ChartContainer title="Monthly Pipeline Trend">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyPipeline}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>

                     {/* Top Products Revenue */}
                    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3 pt-4">
                        <CardTitle className="text-base font-semibold text-slate-800">Top Products</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 overflow-y-auto h-72">
                         {productPerformance?.length ? (
                          <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold sticky top-0">
                              <tr>
                                <th className="px-4 py-3">Product</th>
                                <th className="px-4 py-3 text-right">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {productPerformance.map((p: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 font-medium text-slate-700">{p.name}</td>
                                  <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{p.revenue.toLocaleString("en-IN")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <EmptyState />
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Revenue by Customer */}
                    <ChartContainer title="Top Customers by Revenue">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueBreakdown.byCustomer} barSize={40}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" hide />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                          <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>

                     {/* Sales Order Status */}
                     <ChartContainer title="Sales Order Status">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
  data={[
    {
      name: "Draft",
      value: reportData?.raw?.salesOrders?.filter(
        (o: any) => o.status === "draft"
      ).length || 0,
    },
    {
      name: "Confirmed",
      value: reportData?.raw?.salesOrders?.filter(
        (o: any) => o.status === "confirmed"
      ).length || 0,
    },
    {
      name: "Shipped",
      value: reportData?.raw?.salesOrders?.filter(
        (o: any) => o.status === "shipped"
      ).length || 0,
    },
    {
      name: "Delivered",
      value: reportData?.raw?.salesOrders?.filter(
        (o: any) => o.status === "delivered"
      ).length || 0,
    },
    {
      name: "Cancelled",
      value: reportData?.raw?.salesOrders?.filter(
        (o: any) => o.status === "cancelled"
      ).length || 0,
    },
  ]}
  dataKey="value"
  nameKey="name"
  innerRadius={60}
  outerRadius={100}
  paddingAngle={5}
>
  <Cell fill="#94A3B8" /> {/* Draft */}
  <Cell fill="#6366F1" /> {/* Confirmed */}
  <Cell fill="#F59E0B" /> {/* Shipped */}
  <Cell fill="#10B981" /> {/* Delivered */}
  <Cell fill="#EF4444" /> {/* Cancelled */}
</Pie>

                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                     </ChartContainer>
                  </div>
                </>
              )}
            </>
          )}

          {/* ---------------------- FINANCE ---------------------- */}
          {activeTab === "finance" && (
            <>
              {tabLoading.finance ? (
                <div className="flex h-64 items-center justify-center text-slate-400 font-medium animate-pulse">Loading finance data...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Finance KPIs - Clean Style */}
                    <KPICard title="Total Income" value={`₹${(financeData?.totalIncome || 0).toLocaleString("en-IN")}`} subtext="Deals + Paid Sales" icon={<TrendingUp className="h-5 w-5 text-emerald-600"/>} colorClass="bg-emerald-50" />
                    <KPICard title="Total Expense" value={`₹${(financeData?.totalExpense || 0).toLocaleString("en-IN")}`} subtext="Logs + PO Spend" icon={<TrendingDown className="h-5 w-5 text-rose-600"/>} colorClass="bg-rose-50" />
                    <KPICard title="Net Cash Flow" value={`₹${(financeData?.netCashFlow || 0).toLocaleString("en-IN")}`} subtext="Income - Expense" icon={<Wallet className="h-5 w-5 text-indigo-600"/>} colorClass="bg-indigo-50" />
                    <KPICard title="Profit Margin" value={financeData ? `${financeData.profitMarginPercent}%` : "0%"} subtext="Gross Profit / Income" icon={<Percent className="h-5 w-5 text-amber-600"/>} colorClass="bg-amber-50" />
                  </div>

                  <div className="mt-6">
                    <ChartContainer title="Daily Profit Trend">
                       <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={financeData?.dailyProfit || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Line
  type="monotone"
  dataKey="revenue"
  name="Revenue"
  stroke="#6366F1"
  strokeWidth={3}
  dot={false}
/>

<Line
  type="monotone"
  dataKey="profit"
  name="Profit"
  stroke="#10B981"
  strokeWidth={3}
  dot={false}
/>

<Line
  type="monotone"
  dataKey="expense"
  name="Expenses"
  stroke="#EF4444"
  strokeWidth={3}
  dot={false}
/>
<Legend />
                          </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {/* GST Cards - Cleaned up */}
                    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-100 rounded-lg"><FileText className="h-5 w-5 text-slate-600"/></div>
                        <h3 className="font-semibold text-slate-700">Outward GST</h3>
                      </div>
                      <div className="space-y-1 mt-4">
                        <div className="flex justify-between text-sm text-slate-500"><span>CGST</span> <span className="font-medium text-slate-900">₹{(financeData?.gstSummary?.outward?.CGST ?? 0).toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm text-slate-500"><span>SGST</span> <span className="font-medium text-slate-900">₹{(financeData?.gstSummary?.outward?.SGST ?? 0).toFixed(2)}</span></div>
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold text-slate-900"><span>Total</span> <span>₹{(financeData?.gstSummary?.outward?.Total ?? 0).toFixed(2)}</span></div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-100 rounded-lg"><ShoppingCart className="h-5 w-5 text-slate-600"/></div>
                        <h3 className="font-semibold text-slate-700">Inward GST</h3>
                      </div>
                       <div className="mt-4">
                        <div className="text-sm text-slate-500 mb-1">Total GST Paid to Vendors</div>
                        <div className="text-2xl font-bold text-slate-900">₹{(financeData?.gstSummary?.inward?.GST ?? 0).toFixed(2)}</div>
                      </div>
                    </Card>

                     <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-100 rounded-lg"><CreditCard className="h-5 w-5 text-slate-600"/></div>
                        <h3 className="font-semibold text-slate-700">Net Payable</h3>
                      </div>
                      <div className="mt-4 flex flex-col items-start gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${((financeData?.gstSummary?.net_payable ?? 0) > 0) ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                           ₹{(financeData?.gstSummary?.net_payable ?? 0).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-slate-400">{(financeData?.gstSummary?.net_payable ?? 0) > 0 ? "You owe this amount" : "You have credit"}</span>
                      </div>
                    </Card>
                  </div>
                </>
              )}
            </>
          )}

          {/* ---------------------- INVENTORY ---------------------- */}
          {activeTab === "inventory" && (
             <>
              {tabLoading.inventory ? (
                 <div className="flex h-64 items-center justify-center text-slate-400 font-medium animate-pulse">Loading inventory data...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                    <KPICard title="Total Stock Value" value={`₹${inventoryData?.totalValue?.toLocaleString("en-IN") || 0}`} subtext="Estimated valuation" icon={<Database className="h-5 w-5 text-emerald-600"/>} colorClass="bg-emerald-50" />
                    <KPICard title="Total Units" value={inventoryData?.totalUnits || 0} subtext="Across all products" icon={<Package className="h-5 w-5 text-indigo-600"/>} colorClass="bg-indigo-50" />
                    
                    {/* Custom KPI for In/Out */}
                    <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow rounded-xl">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-slate-500">Flow (30d)</CardTitle>
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Activity className="h-5 w-5" /></div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mt-1">
                          <div>
                            <span className="block text-xs text-slate-400 uppercase">In</span>
                            <span className="text-lg font-bold text-slate-900">{inventoryData?.itemsIn30d || 0}</span>
                          </div>
                          <div className="h-8 w-px bg-slate-100"></div>
                          <div className="text-right">
                             <span className="block text-xs text-slate-400 uppercase">Out</span>
                            <span className="text-lg font-bold text-slate-900">{inventoryData?.itemsOut30d || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <KPICard title="Reorder Alerts" value={inventoryData?.reorderCount || 0} subtext="Products below 15 units" icon={<AlertCircle className="h-5 w-5 text-rose-600"/>} colorClass="bg-rose-50" />
                  </div>

                  <ChartContainer title="Stock Movement Trend (30d)">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={inventoryData?.stockTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Line type="monotone" dataKey="in" stroke="#10B981" strokeWidth={3} dot={false} name="Stock In" />
                        <Line type="monotone" dataKey="out" stroke="#EF4444" strokeWidth={3} dot={false} name="Stock Out" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                          <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">Top Sold Products</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                           <ul className="divide-y divide-slate-100">
                              {(inventoryData?.topSold || []).map((item: any, i: number) => (
                                <li key={i} className="flex justify-between p-4 hover:bg-slate-50 transition-colors">
                                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{item.units} units</span>
                                </li>
                              ))}
                           </ul>
                        </CardContent>
                      </Card>

                      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                          <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">Slow Moving Products</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                           {inventoryData?.slowMoving?.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                              {inventoryData.slowMoving.map((item: any, i: number) => (
                                <li key={i} className="flex justify-between p-4 hover:bg-slate-50 transition-colors">
                                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                  <span className="text-sm text-slate-500">{item.days} days dormant</span>
                                </li>
                              ))}
                            </ul>
                           ) : (
                             <div className="p-4 text-sm text-slate-400 italic">Great! No slow moving inventory.</div>
                           )}
                        </CardContent>
                      </Card>
                   </div>
                </>
              )}
             </>
          )}

          {/* ---------------------- PURCHASE ORDERS ---------------------- */}
          {activeTab === "purchase_orders" && (
             <>
               {tabLoading.purchase_orders ? (
                  <div className="flex h-64 items-center justify-center text-slate-400 font-medium animate-pulse">Loading PO data...</div>
               ) : (
                 <>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <KPICard title="Total POs" value={poInsights.summary.totalPOs} subtext="Created" icon={<FilePlus className="h-5 w-5 text-violet-600"/>} colorClass="bg-violet-50" />
                      <KPICard title="Total Spend" value={`₹${poInsights.summary.totalSpend?.toLocaleString("en-IN")}`} subtext="Total cost" icon={<IndianRupee className="h-5 w-5 text-emerald-600"/>} colorClass="bg-emerald-50" />
                      <KPICard title="Avg PO Value" value={`₹${poInsights.summary.avgPOValue.toLocaleString("en-IN")}`} subtext="Spend / Count" icon={<BarChart3 className="h-5 w-5 text-amber-600"/>} colorClass="bg-amber-50" />
                      <KPICard title="Vendors" value={poInsights.summary.vendorCount} subtext="Active suppliers" icon={<Truck className="h-5 w-5 text-sky-600"/>} colorClass="bg-sky-50" />
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <ChartContainer title="PO Status Distribution">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
  { name: "Draft", value: poInsights.statusSummary.draft },
  { name: "Pending", value: poInsights.statusSummary.pending },
  { name: "Approved", value: poInsights.statusSummary.approved },
  { name: "Received", value: poInsights.statusSummary.received },
  { name: "Cancelled", value: poInsights.statusSummary.cancelled },
]}

                                dataKey="value"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                              >
                                <Cell fill="#94A3B8" />  {/* Draft */}
<Cell fill="#F59E0B" />  {/* Pending */}
<Cell fill="#6366F1" />  {/* Approved */}
<Cell fill="#10B981" />  {/* Received */}
<Cell fill="#EF4444" />  {/* Cancelled */}

                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                              <Legend verticalAlign="bottom" iconType="circle" />
                            </PieChart>
                         </ResponsiveContainer>
                      </ChartContainer>

                      <ChartContainer title="Daily Purchase Trend">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={poInsights.dailyTrend}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                              <Line type="monotone" dataKey="qty" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
                            </LineChart>
                         </ResponsiveContainer>
                      </ChartContainer>
                   </div>
                 </>
               )}
             </>
          )}

           {/* ---------------------- ACTIVITIES ---------------------- */}
           {activeTab === "activities" && (
  <div className="space-y-6">  {/* 👈 SINGLE ROOT CONTAINER */}

    {tabLoading.activities ? (
      <div className="flex h-64 items-center justify-center text-slate-400 font-medium animate-pulse">
        Loading activity log...
      </div>
    ) : (
      <>
        {/* ACTIVITY KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <KPICard
  title="Time Spent"
  value={`${activityStats.onlineMinutes} min`}
  subtext="Active time inside One"
  icon={<Activity className="h-5 w-5 text-indigo-600" />}
  colorClass="bg-indigo-50"
/>


          <KPICard
            title="Completion Rate"
            value={`${activityStats.completionRate}%`}
            subtext="Tasks completed"
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            colorClass="bg-emerald-50"
          />

          <KPICard
            title="Focus Index"
            value={`${activityStats.focusIndex}%`}
            subtext="Productive time"
            icon={<Target className="h-5 w-5 text-amber-600" />}
            colorClass="bg-amber-50"
          />

          <KPICard
            title="Productivity"
            value={activityStats.productivityScore}
            subtext="Overall score"
            icon={<Zap className="h-5 w-5 text-rose-600" />}
            colorClass="bg-rose-50"
          />

          

        </div>

        



{activityStats.overloadDays > 0 && (
  <Card className="border-rose-200 bg-rose-50">
    <CardContent className="flex items-center gap-3 p-4">
      <AlertCircle className="text-rose-600" />
      <p className="text-sm text-rose-700 font-medium">
        You exceeded 8 hours on {activityStats.overloadDays} day(s). Consider breaks.
      </p>
    </CardContent>
  </Card>
)}

<LineChart data={activityStats.dailyMinutes}>
  <Line dataKey="minutes" stroke="#6366F1" strokeWidth={3} />
</LineChart>




        {/* ACTIVITY CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartContainer title="Activity Types">
            {activityStats.byType?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activityStats.byType}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {activityStats.byType.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </ChartContainer>

          <ChartContainer title="Daily Activity Count">
            {activityStats.daily?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityStats.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F9423A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState />
            )}
          </ChartContainer>
        </div>
      </>
    )}
  </div>
)}


        </div>
      </div>
    </div>
  );
};


// ---------------- HELPER COMPONENTS (Place these inside or outside the file) ----------------

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all duration-200
        ${
          active
            ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }
      `}
    >
      {label}
    </button>
  );
}

function KPICard({ title, value, subtext, icon, colorClass }: { title: string, value: string | number, subtext: string, icon: React.ReactNode, colorClass: string }) {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <p className="text-xs font-medium text-slate-400 mt-1">{subtext}</p>
      </CardContent>
    </Card>
  )
}

function ChartContainer({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="border-b border-slate-100 py-4">
        <CardTitle className="text-base font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80 p-4">
        {children}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">No data available for this period.</div>
}

// Icons (Ensure these are imported from lucide-react)


export default Reports;
