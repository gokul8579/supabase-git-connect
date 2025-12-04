import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Download,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Calendar,
  Phone,
  Package,
} from "lucide-react";

import { toast } from "sonner";

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
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]
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

  // Additional datasets for tabs:
  const [funnelData, setFunnelData] = useState<
    { name: string; value: number }[]
  >([]);
  const [monthlyPipeline, setMonthlyPipeline] = useState<any[]>([]);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [revenueBreakdown, setRevenueBreakdown] = useState<any>({
    byMonth: [],
    byCustomer: [],
    byProductType: [],
  });
  const [dailyProfit, setDailyProfit] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [stockValue, setStockValue] = useState<number>(0);
  const [poInsights, setPoInsights] = useState<any>({
    vendorTotals: [],
    monthlyPOs: [],
  });
  const [activityStats, setActivityStats] = useState<any>({
    byType: [],
    daily: [],
  });

  // Mark which tabs are loading individually
  const [tabLoading, setTabLoading] = useState<Record<TabKey, boolean>>({
    overview: false,
    sales: false,
    finance: false,
    inventory: false,
    purchase_orders: false,
    activities: false,
  });

  // Overview (existing) - fetch on mount + date changes
  useEffect(() => {
    if (activeTab === "overview") fetchOverviewData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, activeTab]);

  // When tab changes, lazily load data
  useEffect(() => {
    if (!loadedTabs[activeTab]) {
      // call the appropriate loader
      loadTabData(activeTab);
      setLoadedTabs((s) => ({ ...s, [activeTab]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      setTabLoading((t) => ({ ...t, overview: true }));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const start = new Date(startDate);
      const end = new Date(endDate);

      const [
        leads,
        customers,
        deals,
        salesOrders,
        dailyLogs,
        calls,
        products,
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),

        supabase
          .from("customers")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),

        supabase
          .from("deals")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),

        supabase
          .from("sales_orders")
          .select("*")
          .eq("user_id", user.id)
          .gte("order_date", startDate)
          .lte("order_date", endDate),

        supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", user.id)
          .gte("log_date", startDate)
          .lte("log_date", endDate),

        supabase
          .from("calls")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString()),

        supabase.from("products").select("*").eq("user_id", user.id),
      ]);

      // --- FETCH SALES ORDER ITEMS ---
let salesOrderItems: any[] = [];

if (salesOrders.data && salesOrders.data.length > 0) {
  const orderIds = salesOrders.data.map((o: any) => o.id);

  const { data: items } = await supabase
    .from("sales_order_items")
    .select("*")
    .in("sales_order_id", orderIds);

  salesOrderItems = items || [];
}


      const wonDeals = deals.data?.filter((d) => d.stage === "closed_won") || [];
      const lostDeals = deals.data?.filter((d) => d.stage === "closed_lost") || [];
      const activeDeals =
        deals.data?.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost") ||
        [];
      const convertedLeads = leads.data?.filter((l) => l.status === "qualified") || [];

      const totalRevenue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const totalProfit = wonDeals.reduce(
        (sum, d) => sum + (Number(d.expected_profit) || 0),
        0
      );

      const completedOrders = salesOrders.data?.filter((o) => o.status === "delivered") || [];
      const pendingOrders =
        salesOrders.data?.filter((o) => o.status !== "delivered" && o.status !== "cancelled") ||
        [];

      const completedCalls = calls.data?.filter((c) => c.status === "completed") || [];

      const conversionRate =
        leads.data && leads.data.length > 0 ? Math.min((convertedLeads.length / leads.data.length) * 100, 100) : 0;

      const leadSourceCounts: Record<string, number> = {};
      leads.data?.forEach((lead) => {
        leadSourceCounts[lead.source] = (leadSourceCounts[lead.source] || 0) + 1;
      });

      const dealStageCounts: Record<string, number> = {};
      deals.data?.forEach((deal) => {
        dealStageCounts[deal.stage] = (dealStageCounts[deal.stage] || 0) + 1;
      });

      const totalExpenses =
        dailyLogs.data?.reduce((sum, log) => sum + Number(log.expense_amount || 0), 0) || 0;

      const totalIncome =
        dailyLogs.data?.reduce((sum, log) => sum + Number(log.income_amount || 0), 0) || 0;

      const totalSales =
        dailyLogs.data?.reduce((sum, log) => sum + Number(log.sales_amount || 0), 0) || 0;


      // Compute sales order profit using items + cost_price based on product meta
let salesOrderProfit = 0;

if (salesOrderItems.length > 0) {
  const productMap: any = {};
  (products.data || []).forEach((p: any) => {
    productMap[p.id] = Number(p.cost_price || 0);
  });

  salesOrderItems.forEach((item: any) => {
    const qty = Number(item.quantity || 0);
    const sellingPrice = Number(item.unit_price || 0);
    const cost = productMap[item.product_id] || 0;

    salesOrderProfit += (sellingPrice - cost) * qty;
  });
}


      setReportData({
        summary: {
  totalLeads: leads.data?.length || 0,
  convertedLeads: convertedLeads.length,
  totalCustomers: customers.data?.length || 0,
  totalDeals: deals.data?.length || 0,
  wonDeals: wonDeals.length,
  lostDeals: lostDeals.length,
  activeDeals: activeDeals.length,

  // --- DEALS ---
  dealRevenue: totalRevenue,             // closed-won revenue
  dealProfit: totalProfit,               // closed-won expected profit

  // --- SALES ORDERS ---
  salesOrderRevenue: salesOrders.data?.reduce(
    (sum, o) => sum + Number(o.total_amount || 0),
    0
  ),
  salesOrderProfit: salesOrderProfit,    // calculated earlier

  // --- TOTAL PROFIT = DEALS + SALES ORDERS ---
  totalProfit:
    totalProfit +                        // deals profit
    (salesOrderProfit || 0),             // sales order profit

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

  // -------------------------
  // Tab loaders
  // -------------------------
  const loadTabData = async (tab: TabKey) => {
    switch (tab) {
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

  // 1) Sales: funnel + monthly pipeline + product performance + revenue breakdown subset
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

      // Fetch leads and deals in date range
      const [leadsRes, dealsRes, salesOrdersRes, productsRes, customersRes] =
        await Promise.all([
          supabase
            .from("leads")
            .select("*")
            .eq("user_id", user.id)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString()),
          supabase
            .from("deals")
            .select("*")
            .eq("user_id", user.id)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString()),
          supabase
            .from("sales_orders")
            .select("*")
            .eq("user_id", user.id)
            .gte("order_date", startDate)
            .lte("order_date", endDate),
          
          supabase.from("products").select("*").eq("user_id", user.id),
          supabase.from("customers").select("*").eq("user_id", user.id),
        ]);

        // Now fetch items using sales_order IDs
let salesOrderItems: any[] = [];

if (salesOrdersRes.data && salesOrdersRes.data.length > 0) {
  const orderIds = salesOrdersRes.data.map((o: any) => o.id);

  const { data: items } = await supabase
    .from("sales_order_items")
    .select("*")
    .in("sales_order_id", orderIds);

  salesOrderItems = items || [];
}


      // If empty, fetch items by sales_order ids
      if ((!salesOrderItems || salesOrderItems.length === 0) && salesOrdersRes.data?.length) {
        const orderIds = salesOrdersRes.data.map((o: any) => o.id);
        if (orderIds.length > 0) {
          const { data: itemsByOrder } = await supabase
            .from("sales_order_items")
            .select("*")
            .in("sales_order_id", orderIds);
          salesOrderItems = itemsByOrder || [];
        }
      }

      // Funnel: counts for lead stages -> deals -> won
      const totalLeads = leadsRes.data?.length || 0;
      const contacted = leadsRes.data?.filter((l) => l.status === "contacted").length || 0;
      const qualified = leadsRes.data?.filter((l) => l.status === "qualified").length || 0;
      const totalDeals = dealsRes.data?.length || 0;
      const wonDeals = dealsRes.data?.filter((d) => d.stage === "closed_won").length || 0;

      setFunnelData([
        { name: "Leads", value: totalLeads },
        { name: "Contacted", value: contacted },
        { name: "Qualified", value: qualified },
        { name: "Deals", value: totalDeals },
        { name: "Won", value: wonDeals },
      ]);

      // Monthly pipeline: sum of deals.value by month
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

      // Product performance: aggregate from sales_order_items
      // salesOrderItems -> { product_id, quantity, unit_price }
      const products = (productsRes as any).data || [];
      const prodAgg: Record<string, { productId: string; units: number; revenue: number; name?: string; cost?: number }> =
        {};

      (salesOrderItems || []).forEach((it: any) => {
        const pid = it.product_id || it.productId || "unknown";
        const qty = Number(it.quantity || 0);
        const price = Number(it.unit_price || it.list_price || 0);
        if (!prodAgg[pid]) prodAgg[pid] = { productId: pid, units: 0, revenue: 0, name: undefined, cost: 0 };
        prodAgg[pid].units += qty;
        prodAgg[pid].revenue += qty * price;
      });

      // attach product names and cost
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

      // Revenue breakdown by month (from salesOrders) and by customer
      const revenueByMonthMap: Record<string, number> = {};
      const revenueByCustomerMap: Record<string, number> = {};
      const byProductTypeMap: Record<string, number> = {};

      (salesOrdersRes.data || []).forEach((o: any) => {
        const d = o.order_date ? new Date(o.order_date) : new Date(o.created_at || Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        revenueByMonthMap[key] = (revenueByMonthMap[key] || 0) + (Number(o.total_amount) || 0);

        const cust = o.customer_id || "unknown";
        revenueByCustomerMap[cust] = (revenueByCustomerMap[cust] || 0) + (Number(o.total_amount) || 0);
      });

      // classify product type totals by product metadata from prodAgg & products list
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
          const c = (customersRes as any).data?.find((x: any) => x.id === custId);
          return { name: c ? c.name : "Unknown", revenue: total };
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

  // 2) Finance: daily profit heatmap (implemented as daily net profit bar series)
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

      const { data: logs } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", startDate)
        .lte("log_date", endDate);

      const arr = (logs || []).map((l: any) => ({
        date: l.log_date,
        income: Number(l.income_amount || 0),
        expense: Number(l.expense_amount || 0),
        net: (Number(l.income_amount || 0) - Number(l.expense_amount || 0)) || 0,
      }));

      // sort by date ascending
      arr.sort((a: any, b: any) => (a.date > b.date ? 1 : -1));
      setDailyProfit(arr);
    } catch (err) {
      console.error("loadFinanceAnalytics err", err);
      toast.error("Error loading Finance analytics");
    } finally {
      setTabLoading((t) => ({ ...t, finance: false }));
    }
  };

  // 3) Inventory: low stock & stock value
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

      const { data: products } = await supabase.from("products").select("*").eq("user_id", user.id);

      const arr = (products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        qty: Number(p.quantity_in_stock || 0),
        reorder_level: Number(p.reorder_level || 0),
        unit_price: Number(p.unit_price || 0),
      }));

      const low = arr.filter((p) => p.qty <= p.reorder_level).sort((a, b) => a.qty - b.qty);
      const totalStockValue = arr.reduce((sum, p) => sum + p.qty * p.unit_price, 0);

      setLowStock(low);
      setStockValue(totalStockValue);
    } catch (err) {
      console.error("loadInventoryAnalytics err", err);
      toast.error("Error loading Inventory analytics");
    } finally {
      setTabLoading((t) => ({ ...t, inventory: false }));
    }
  };

  // 4) Purchase Order Insights
  const loadPurchaseOrderInsights = async () => {
    setTabLoading((t) => ({ ...t, purchase_orders: true }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setTabLoading((t) => ({ ...t, purchase_orders: false }));
        return;
      }

      const { data: pos } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("order_date", startDate)
        .lte("order_date", endDate);

      // vendor-wise totals
      const vendorMap: Record<string, number> = {};
      (pos || []).forEach((p: any) => {
        const v = p.vendor_id || "unknown";
        vendorMap[v] = (vendorMap[v] || 0) + (Number(p.total_amount) || 0);
      });

      // fetch vendor names
      const vendorIds = Object.keys(vendorMap).filter((id) => id !== "unknown");
      let vendorsById: any[] = [];
      if (vendorIds.length) {
        const { data: vendors } = await supabase.from("vendors").select("*").in("id", vendorIds);
        vendorsById = vendors || [];
      }

      const vendorTotals = Object.entries(vendorMap).map(([vid, total]) => {
        const v = vendorsById.find((x) => x.id === vid);
        return { name: v ? v.name : "Unknown Vendor", total };
      });

      // monthly PO counts / totals
      const monthMap: Record<string, number> = {};
      (pos || []).forEach((p: any) => {
        const d = p.order_date ? new Date(p.order_date) : new Date(p.created_at || Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap[key] = (monthMap[key] || 0) + (Number(p.total_amount) || 0);
      });

      const monthlyPOs = Object.entries(monthMap)
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => (a.month > b.month ? 1 : -1));

      setPoInsights({ vendorTotals, monthlyPOs });
    } catch (err) {
      console.error("loadPurchaseOrderInsights err", err);
      toast.error("Error loading Purchase Order insights");
    } finally {
      setTabLoading((t) => ({ ...t, purchase_orders: false }));
    }
  };

  // 5) Activity Stats
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

      const { data: acts } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate + "T00:00:00Z")
        .lte("created_at", endDate + "T23:59:59Z");

      const typeMap: Record<string, number> = {};
      const dailyMap: Record<string, number> = {};
      (acts || []).forEach((a: any) => {
        const t = a.activity_type || "unknown";
        typeMap[t] = (typeMap[t] || 0) + 1;
        const d = a.created_at ? new Date(a.created_at).toISOString().split("T")[0] : null;
        if (d) dailyMap[d] = (dailyMap[d] || 0) + 1;
      });

      const byType = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
      const byDaily = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      setActivityStats({ byType, daily: byDaily });
    } catch (err) {
      console.error("loadActivityStats err", err);
      toast.error("Error loading Activity stats");
    } finally {
      setTabLoading((t) => ({ ...t, activities: false }));
    }
  };

  // small helper UI loader
  const isAnyLoading = loading || Object.values(tabLoading).some(Boolean);

  // derived metrics for overview
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

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">CRM Reports & Analytics</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Comprehensive business insights and data visualization
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex gap-2 items-center">
            <Label className="text-xs md:text-sm whitespace-nowrap">From:</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-40 text-sm" />
          </div>

          <div className="flex gap-2 items-center">
            <Label className="text-xs md:text-sm whitespace-nowrap">To:</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-40 text-sm" />
          </div>

          <Button onClick={downloadReportAsImage} disabled={isAnyLoading} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            <span className="text-xs md:text-sm">Download</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-2 rounded-md text-sm ${activeTab === "overview" ? "bg-primary text-primary-foreground" : "bg-muted/10"}`}
        >
          Overview
        </button>

        <button
          onClick={() => setActiveTab("sales")}
          className={`px-3 py-2 rounded-md text-sm ${activeTab === "sales" ? "bg-primary text-primary-foreground" : "bg-muted/10"}`}
        >
          Sales Analytics
        </button>

        <button
          onClick={() => setActiveTab("finance")}
          className={`px-3 py-2 rounded-md text-sm ${activeTab === "finance" ? "bg-primary text-primary-foreground" : "bg-muted/10"}`}
        >
          Finance
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-3 py-2 rounded-md text-sm ${activeTab === "inventory" ? "bg-primary text-primary-foreground" : "bg-muted/10"}`}
        >
          Inventory
        </button>

        <button
          onClick={() => setActiveTab("purchase_orders")}
          className={`px-3 py-2 rounded-md text-sm ${activeTab === "purchase_orders" ? "bg-primary text-primary-foreground" : "bg-muted/10"}`}
        >
          Purchase Orders
        </button>

        <button
          onClick={() => setActiveTab("activities")}
          className={`px-3 py-2 rounded-md text-sm ${activeTab === "activities" ? "bg-primary text-primary-foreground" : "bg-muted/10"}`}
        >
          Activities
        </button>
      </div>

      {/* Report Body */}
      <div ref={reportRef} className="bg-background p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {loading ? (
              <div className="text-center py-12">Loading overview...</div>
            ) : (
              reportData && (
                <>
                  {/* KPIs */}
                  <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{reportData.summary.totalLeads}</div>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.convertedLeads} converted ({conversionRate}%)
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{reportData.summary.totalCustomers}</div>
                        <p className="text-xs text-muted-foreground">Active accounts</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Deals Overview</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{reportData.summary.wonDeals}</div>
                        <p className="text-xs text-muted-foreground">
                          Won / {reportData.summary.activeDeals} Active / {reportData.summary.lostDeals} Lost
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
  <CardHeader className="pb-2 flex flex-row items-center justify-between">
    <CardTitle className="text-sm font-medium">Deals Revenue</CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      ₹{reportData.summary.dealRevenue.toLocaleString("en-IN")}
    </div>
    <p className="text-xs text-muted-foreground">From closed-won deals</p>
  </CardContent>
</Card>

<Card>
  <CardHeader className="pb-2 flex flex-row items-center justify-between">
    <CardTitle className="text-sm font-medium">Deals Profit</CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      ₹{reportData.summary.dealProfit.toLocaleString("en-IN")}
    </div>
    <p className="text-xs text-muted-foreground">Expected profit from won deals</p>
  </CardContent>
</Card>

<Card>
  <CardHeader className="pb-2 flex flex-row items-center justify-between">
    <CardTitle className="text-sm font-medium">Sales Order Revenue</CardTitle>
    <Calendar className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      ₹{reportData.summary.salesOrderRevenue.toLocaleString("en-IN")}
    </div>
    <p className="text-xs text-muted-foreground">All delivered orders</p>
  </CardContent>
</Card>

<Card>
  <CardHeader className="pb-2 flex flex-row items-center justify-between">
    <CardTitle className="text-sm font-medium">Sales Order Profit</CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      ₹{reportData.summary.salesOrderProfit.toLocaleString("en-IN")}
    </div>
    <p className="text-xs text-muted-foreground">Profit from orders</p>
  </CardContent>
</Card>


                    {/* more KPIs */}
                    <Card>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">₹{reportData.summary.totalProfit.toLocaleString("en-IN")}</div>
                        <p className="text-xs text-muted-foreground">Expected from won deals</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Sales Orders</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{reportData.summary.completedOrders}</div>
                        <p className="text-xs text-muted-foreground">{reportData.summary.pendingOrders} pending</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ₹{(reportData.summary.totalIncome - reportData.summary.totalExpenses).toLocaleString("en-IN")}
                        </div>
                        <p className="text-xs text-muted-foreground">From daily logs</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{reportData.summary.totalCalls}</div>
                        <p className="text-xs text-muted-foreground">
                          {reportData.summary.completedCalls} completed ({callCompletionRate}%)
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* small charts from overview: leads by source + deals by stage */}
                  <div className="grid gap-4 md:gap-6 md:grid-cols-2">
                    {/* Leads by Source */}
                    {reportData.leadsBySource?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base md:text-lg">Leads by Source</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                            <PieChart>
                              <Pie
                                data={reportData.leadsBySource}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label
                              >
                                {reportData.leadsBySource.map((_: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}

                    {/* Deals by Stage */}
                    {reportData.dealsByStage?.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base md:text-lg">Deals by Stage</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
                            <BarChart data={reportData.dealsByStage}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#F9423A" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Performance summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Summary</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Lead Conversion Rate</span>
                        <span className="text-2xl font-bold text-primary">{conversionRate}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Deal Win Rate</span>
                        <span className="text-2xl font-bold text-primary">{winRate}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Call Completion Rate</span>
                        <span className="text-2xl font-bold text-primary">{callCompletionRate}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Average Deal Value</span>
                        <span className="text-2xl font-bold text-primary">
                          ₹
                          {reportData.summary.wonDeals > 0
                            ? (reportData.summary.totalRevenue / reportData.summary.wonDeals).toLocaleString("en-IN", {
                                maximumFractionDigits: 0,
                              })
                            : 0}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )
            )}
          </>
        )}

        {/* Sales Analytics Tab */}
        {activeTab === "sales" && (
          <>
            {tabLoading.sales ? (
              <div className="text-center py-12">Loading sales analytics...</div>
            ) : (
              <>
                {/* Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Funnel</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="h-56">
                      {funnelData && funnelData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={[...funnelData].reverse()} // reverse to show top->bottom visually
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" />
                            <Tooltip />
                            <Bar dataKey="value" isAnimationActive={false}>
                              {funnelData.map((_, idx) => (
                                <Cell key={`f-${idx}`} fill={COLORS[idx % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-sm text-muted-foreground">No funnel data for this period.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Pipeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Pipeline Trend</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {monthlyPipeline && monthlyPipeline.length > 0 ? (
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyPipeline}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No pipeline data for this period.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Product Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Products (by Revenue)</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {productPerformance && productPerformance.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={productPerformance}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" />
                            <Bar dataKey="units" name="Units Sold" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No product sales data available.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Revenue breakdown mini cards */}
                <div className="grid gap-4 md:gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueBreakdown.byMonth && revenueBreakdown.byMonth.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={revenueBreakdown.byMonth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="revenue" fill="#10B981" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-sm text-muted-foreground">No revenue month data</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueBreakdown.byCustomer && revenueBreakdown.byCustomer.length > 0 ? (
                        <ul className="space-y-2 max-h-44 overflow-auto">
                          {revenueBreakdown.byCustomer.map((c: any) => (
                            <li key={c.name} className="flex justify-between">
                              <span className="text-sm">{c.name}</span>
                              <span className="font-medium">₹{c.revenue.toLocaleString("en-IN")}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground">No customer revenue data</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue by Product Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueBreakdown.byProductType && revenueBreakdown.byProductType.length > 0 ? (
                        <PieChart width={250} height={200}>
                          <Pie
                            data={revenueBreakdown.byProductType}
                            dataKey="revenue"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label
                          >
                            {revenueBreakdown.byProductType.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      ) : (
                        <div className="text-sm text-muted-foreground">No product type revenue</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </>
        )}

        {/* Finance Tab */}
        {activeTab === "finance" && (
          <>
            {tabLoading.finance ? (
              <div className="text-center py-12">Loading finance analytics...</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Net Profit (Income - Expense)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyProfit && dailyProfit.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyProfit}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="net" fill="#F59E0B" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-sm text-muted-foreground">No daily financial logs for this period.</div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <>
            {tabLoading.inventory ? (
              <div className="text-center py-12">Loading inventory analytics...</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Low Stock Alerts</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {lowStock && lowStock.length > 0 ? (
                      <div className="space-y-2">
                        {lowStock.map((p: any) => (
                          <div key={p.id} className="flex justify-between">
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Qty: {p.qty} • Reorder level: {p.reorder_level}
                              </div>
                            </div>

                            <div className="text-sm font-medium">₹{(p.unit_price * p.qty).toLocaleString("en-IN")}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No low stock items</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Total Stock Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{stockValue.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground">Estimated stock value (qty * unit price)</p>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Purchase Orders Tab */}
        {activeTab === "purchase_orders" && (
          <>
            {tabLoading.purchase_orders ? (
              <div className="text-center py-12">Loading purchase orders...</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Purchase Totals</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {poInsights.vendorTotals && poInsights.vendorTotals.length > 0 ? (
                      <ul className="space-y-2">
                        {poInsights.vendorTotals.map((v: any) => (
                          <li key={v.name} className="flex justify-between">
                            <span>{v.name}</span>
                            <span className="font-medium">₹{v.total.toLocaleString("en-IN")}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-muted-foreground">No purchase orders in this range.</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Purchase Amounts</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {poInsights.monthlyPOs && poInsights.monthlyPOs.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={poInsights.monthlyPOs}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="total" fill="#4F46E5" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-sm text-muted-foreground">No monthly PO data</div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* Activities Tab */}
        {activeTab === "activities" && (
          <>
            {tabLoading.activities ? (
              <div className="text-center py-12">Loading activity stats...</div>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Types</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {activityStats.byType && activityStats.byType.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={activityStats.byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {activityStats.byType.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-sm text-muted-foreground">No activities recorded</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Daily Activity Count</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {activityStats.daily && activityStats.daily.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={activityStats.daily}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#F9423A" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-sm text-muted-foreground">No daily activity data</div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
