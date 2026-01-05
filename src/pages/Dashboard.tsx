import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, DollarSign, CheckCircle, TrendingUp, AlertCircle, UserPlus, Phone, FileText, Calendar, Truck } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PendingTasks } from "@/components/dashboard/PendingTasks";
import { AdvancedAnalytics } from "@/components/dashboard/AdvancedAnalytics";
import { formatIndianCurrency } from "@/lib/formatUtils";
import { EduvancaLoader } from "@/components/EduvancaLoader";


interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  totalDeals: number;
  wonDeals: number;
  
  pendingTasks: number;
  pendingPayments: number;
  overdueDeliveries: number;
}

interface UpcomingCall {
  id: string;
  title: string;
  scheduled_at: string;
  status: string;
}

interface SalesOrderItemRow {
  taxable_value: number | null;
  unit_price: number | null;
  quantity: number | null;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  description: string | null;
}


const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalCustomers: 0,
    totalDeals: 0,
    wonDeals: 0,
    
    pendingTasks: 0,
    pendingPayments: 0,
    overdueDeliveries: 0,
  });
  const [pendingPurchaseOrders, setPendingPurchaseOrders] = useState(0);
  const [totalDeliveredSO, setTotalDeliveredSO] = useState(0);
  const [loading, setLoading] = useState(true);
  const [upcomingCalls, setUpcomingCalls] = useState<UpcomingCall[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState({
    leadsBySource: [] as { name: string; value: number }[],
    dealsByStage: [] as { name: string; value: number }[],
    monthlyRevenue: [] as { monthKey: string; month: string; revenue: number; deals: number }[],
    conversionRate: 0,
    avgDealValue: 0,
    activeCustomers: 0,
  });
  const [dashboardSummary, setDashboardSummary] = useState({
  dealRevenue: 0,
  salesOrderRevenue: 0,
  taxCollected: 0,
  serviceCharges: 0,
  totalProfit: 0,
});

const [dashboardInsights, setDashboardInsights] = useState<
  {
    component: string;
    severity: "info" | "warning" | "danger";
    period: "Today" | "This Week" | "This Month";
    message: string;
    impactValue: number;
  }[]
>([]);



  useEffect(() => {
    checkAuth();
    fetchStats();
    
    // Setup realtime subscription
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
  fetchDashboardSummary();
}, []);

  const fetchDashboardSummary = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // SALES ORDERS (paid + delivered)
  const { data: salesOrders } = await supabase
    .from("sales_orders")
    .select("*")
    .eq("user_id", user.id)
    .eq("payment_status", "paid")
    .eq("status", "delivered");

  // SALES ORDER ITEMS
  let salesOrderItems: any[] = [];
  if (salesOrders?.length) {
    const orderIds = salesOrders.map((o: any) => o.id);

    const { data: items } = await supabase
      .from("sales_order_items")
      .select("*, products:products(product_type, cost_price)")
      .in("sales_order_id", orderIds);

    salesOrderItems = items || [];
  }

  // ---------- SALES ORDER REVENUE ----------
  const getLineTaxable = (it: any) =>
    Number(
      (it.taxable_value ??
        Number(it.unit_price || 0) * Number(it.quantity || 0)) || 0
    );

  const salesOrderRevenue = salesOrderItems.reduce((sum, it) => {
    const type = (it.products?.product_type || "").toLowerCase();
    if (type === "goods") return sum + getLineTaxable(it);
    return sum;
  }, 0);

  // ---------- TAX COLLECTED ----------
  const taxCollected = salesOrderItems.reduce(
    (sum, it) =>
      sum +
      Number(it.cgst_amount || 0) +
      Number(it.sgst_amount || 0) +
      Number(it.igst_amount || 0),
    0
  );

  // ---------- DEAL REVENUE ----------
  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("user_id", user.id)
    .eq("stage", "closed_won");

  const wonDeals = deals || [];

  const wonDealIds = wonDeals.map((d: any) => d.id);

  let dealItems: any[] = [];
  if (wonDealIds.length) {
    const { data: dItems } = await supabase
      .from("deal_items")
      .select("*, products:products(product_type, cost_price)")
      .in("deal_id", wonDealIds);

    dealItems = dItems || [];
  }

  // Deal Goods Revenue
  let dealRevenue = 0;
  dealItems.forEach((it: any) => {
    const type = (it.products?.product_type || "").toLowerCase();
    if (type === "goods") {
      const qty = Number(it.quantity || 1);
      const val = Number(it.taxable_value ?? it.unit_price * qty);
      dealRevenue += val;
    }
  });

  // ---------- SERVICE CHARGES ----------
  let serviceCharges = 0;

  // from SO lines
  salesOrderItems.forEach((it) => {
    const desc = (it.description || "").toLowerCase();
    const isService =
      desc.includes("service") ||
      desc.includes("charge") ||
      desc.includes("installation") ||
      desc.includes("delivery");

    if (isService) serviceCharges += getLineTaxable(it);
  });

  // from deal_items
  dealItems.forEach((it) => {
    const type = (it.products?.product_type || "").toLowerCase();
    const name = (it.description || "").toLowerCase();

    if (type === "service" || name.includes("service") || name.includes("charge")) {
      const qty = Number(it.quantity || 1);
      const val = Number(it.taxable_value ?? it.unit_price * qty);
      serviceCharges += val;
    }
  });

  // ---------- PROFIT ----------
  let soProfit = 0;
  salesOrderItems.forEach((it) => {
    const qty = Number(it.quantity || 1);
    const sell = Number(it.unit_price || 0);
    const cost = Number(it.products?.cost_price || 0);
    const type = (it.products?.product_type || "").toLowerCase();

    if (type === "goods") soProfit += (sell - cost) * qty;
  });

  let dealProfit = wonDeals.reduce(
    (sum, d) => sum + (Number(d.expected_profit) || 0),
    0
  );

  const totalProfit = soProfit + dealProfit;

  setDashboardSummary({
    dealRevenue,
    salesOrderRevenue,
    taxCollected,
    serviceCharges,
    totalProfit,
  });
};

const buildDashboardInsights = (
  params: {
    leads: any[];
    deals: any[];
    tasks: any[];
    salesOrders: any[];
    products?: any[];
    calls?: any[];
  }
) => {
  const insights: any[] = [];

  // ---------------- DEALS INSIGHTS ----------------
const inactiveDeals = params.deals.filter(
  d =>
    !["closed_won", "closed_lost"].includes(d.stage) &&
    new Date(d.updated_at).getTime() <
      Date.now() - 14 * 24 * 60 * 60 * 1000
);

if (inactiveDeals.length > 0) {
  const value = inactiveDeals.reduce(
    (sum, d) => sum + Number(d.value || 0),
    0
  );

  insights.push({
    component: "Deals",
    severity: "danger",
    period: "This Month",
    message: `${formatIndianCurrency(value)} worth of deals inactive for 14 days`,
    impactValue: value,
  });
}

// ---------------- LEADS INSIGHTS ----------------
const staleLeads = params.leads.filter(
  l =>
    l.status !== "converted" &&
    l.last_contacted_at &&
    new Date(l.last_contacted_at).getTime() <
      Date.now() - 2 * 24 * 60 * 60 * 1000
);


if (staleLeads.length > 0) {
  insights.push({
    component: "Leads",
    severity: "warning",
    period: "This Week",
    message: `${staleLeads.length} leads not contacted in last 48 hours`,
    impactValue: staleLeads.length,
  });
}

// ---------------- PAYMENTS INSIGHTS ----------------
const pendingPayments = params.salesOrders.filter(
  so =>
    ["delivered", "shipped"].includes(so.status) &&
    so.payment_status !== "paid"
);

if (pendingPayments.length > 0) {
  const amount = pendingPayments.reduce(
    (sum, so) => sum + Number(so.total_amount || 0),
    0
  );

  insights.push({
    component: "Payments",
    severity: "danger",
    period: "Today",
    message: `₹${formatIndianCurrency(amount)} pending payments need follow-up`,
    impactValue: amount,
  });
}

// ---------------- TASKS INSIGHTS ----------------
const overdueTasks = params.tasks.filter(
  t => t.due_date && new Date(t.due_date) < new Date()
);

if (overdueTasks.length > 0) {
  insights.push({
    component: "Tasks",
    severity: "warning",
    period: "Today",
    message: `${overdueTasks.length} tasks overdue today`,
    impactValue: overdueTasks.length,
  });
}

// ---------------- CALLS INSIGHTS ----------------
if (params.calls) {
  const missedCalls = params.calls.filter(c => c.status === "missed");

  if (missedCalls.length > 0) {
    insights.push({
      component: "Calls",
      severity: "info",
      period: "This Week",
      message: `${missedCalls.length} missed calls need action`,
      impactValue: missedCalls.length,
    });
  }
}

setDashboardInsights(
    insights
      .sort((a, b) => {
        const priority = { danger: 3, warning: 2, info: 1 };
        return (
          priority[b.severity] - priority[a.severity] ||
          b.impactValue - a.impactValue
        );
      })
      .slice(0, 6)
  );

};
  




  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [leads, customers, deals, tasks, calls] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact" }).eq("user_id", user.id),
        supabase.from("customers").select("*", { count: "exact" }).eq("user_id", user.id),
        supabase.from("deals").select("*").eq("user_id", user.id),
        supabase.from("tasks").select("*", { count: "exact" }).eq("user_id", user.id).eq("status", "pending"),
        supabase.from("calls").select("id, title, scheduled_at, status")
  .eq("user_id", user.id)
  .eq("status", "scheduled")
  .gte("scheduled_at", new Date().toISOString())
  .order("scheduled_at", { ascending: true })
  .limit(3),
      ]);

      const activeDeals = deals.data?.filter((d) => d.stage !== "closed_won" && d.stage !== "closed_lost") || [];
      const wonDeals = deals.data?.filter((d) => d.stage === "closed_won") || [];
      
      // Fetch sales orders for total revenue and profit calculation
      const { data: salesOrders } = await supabase
  .from("sales_orders")
  .select("id, total_amount, payment_status, status, created_at, order_date")
  .eq("user_id", user.id);

  // ------------------ FETCH REVENUE DIRECTLY FROM REPORTS (RPC FUNCTION) ------------------
// ---------------- TOTAL DELIVERED SALES ORDER AMOUNT ----------------
const deliveredPaidOrders = (salesOrders || []).filter(
  so =>
    (so.payment_status === "paid") &&
    ["delivered", "shipped"].includes(so.status)
);

// ---------------- TOTAL DELIVERED SALES ORDERS (COUNT) ----------------
setTotalDeliveredSO(deliveredPaidOrders.length);


// ---------------- PENDING PURCHASE ORDERS ----------------
const { count: pendingPOCount } = await supabase
  .from("purchase_orders")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .in("status", ["pending", "draft"]); // adjust if needed

setPendingPurchaseOrders(pendingPOCount || 0);




      // Pending payments count
// Pending Payments = delivered SO but payment NOT paid
const { count: pendingPayCount } = await supabase
  .from("sales_orders")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .in("status", ["delivered", "shipped"])
  .neq("payment_status", "paid");


// On-Hold Orders = any status NOT delivered
const { count: onHoldOrdersCount } = await supabase
  .from("sales_orders")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .neq("status", "delivered");


// ------------------ MATCH REPORTS (CORRECT LOGIC) ------------------



// ------------------ TOTAL DASHBOARD REVENUE = MATCH REPORTS ------------------
//const totalRevenue = dealRevenue + soRevenue + taxCollected + serviceCharges;





    

      // Fetch real won deals (from deals table, not sales orders)
    const { data: wonDealItems } = await supabase
  .from("deal_items")
  .select(`
    quantity,
    unit_price,
    taxable_value,
    deals!inner(updated_at)
  `)
  .eq("deals.user_id", user.id)
  .eq("deals.stage", "closed_won");

console.log("DEBUG: wonDealItems", wonDealItems);

      // Group won deals by month
     // ------------------ MONTHLY REVENUE (LAST 6 MONTHS) ------------------

//const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];



// --- Build last 6 months dynamically ---
const last6Months: { key: string; label: string }[] = [];

for (let i = 5; i >= 0; i--) {
  const d = new Date();
  d.setMonth(d.getMonth() - i);

  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const label = d.toLocaleString("default", {
    month: "short",
    year: "2-digit",
  });

  last6Months.push({ key, label });
}



// Create structure for ONLY last 6 months
const monthlyRevenueMap: Record<
  string,
  { dealRevenue: number; soRevenue: number; totalRevenue: number; closedDeals: number }
> = {};

last6Months.forEach(({ key }) => {
  monthlyRevenueMap[key] = {
    dealRevenue: 0,
    soRevenue: 0,
    totalRevenue: 0,
    closedDeals: 0,
  };
});




// ------------ DEAL REVENUE ------------
// ------------ DEAL REVENUE (FROM DEAL ITEMS) ------------
wonDealItems?.forEach((item: any) => {
  const dt = new Date(item.deals.updated_at);
  const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;

  const qty = Number(item.quantity || 1);
  const val = Number(
    item.taxable_value ??
    (Number(item.unit_price || 0) * qty)
  );

  console.log("DEBUG: deal item month", {
    updatedAt: item.deals.updated_at,
    key,
    value: val,
  });

  if (monthlyRevenueMap[key]) {
    monthlyRevenueMap[key].dealRevenue += val;
    monthlyRevenueMap[key].totalRevenue += val;
  } else {
    console.warn("DEBUG: deal key not in last6Months", key);
  }
});

console.log("DEBUG: monthlyRevenueMap AFTER DEALS", JSON.stringify(monthlyRevenueMap, null, 2));


// ------------ SALES ORDER REVENUE ------------

// Only delivered & paid orders count



// Get items for these orders
const { data: soItems, error: soErr } = await supabase
  .from("sales_order_items")
  .select("sales_order_id, product_id, taxable_value, unit_price, quantity, description, amount, cgst_amount, sgst_amount")
  .in("sales_order_id", deliveredPaidOrders.map((o) => o.id));

  if (soErr) {
  console.error("SO Items Fetch Error:", soErr);
}

// Build product lookup table
//const productIds = [
//  ...new Set(
//    orderItems
//      .map(item => item.product_id)
//      .filter(id => id !== null && id !== undefined)
//  )
//];

const productIds = [
  ...new Set(
    soItems
      ?.map(i => i.product_id)
      .filter(id => id !== null && id !== undefined)
  )
];




const { data: soProducts } = await supabase
  .from("products")
  .select("id, product_type")
  .in("id", productIds);

const productsMap = Object.fromEntries(
  soProducts?.map((p) => [p.id, p]) || []
);



soItems?.forEach((item) => {
  const parent = deliveredPaidOrders.find((o) => o.id === item.sales_order_id);
if (!parent) return;

const dt = new Date(parent.order_date);
//const key = monthNames[dt.getMonth()];
const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;


// Identify if this item is GOODS only
const product = productsMap[item.product_id];
const type = (product?.product_type || "").toLowerCase();

if (type !== "goods") return; // ❌ Skip service lines completely

// Calculate goods line revenue
const lineRevenue = Number(
  item.taxable_value ??
  (Number(item.unit_price || 0) * Number(item.quantity || 0))
);

if (monthlyRevenueMap[key]) {
  monthlyRevenueMap[key].soRevenue += lineRevenue;
  monthlyRevenueMap[key].totalRevenue += lineRevenue;
}


  
});

// ------------ FORMAT FOR CHART ------------
const monthlyRevenue = last6Months.map(({ key, label }) => ({
  monthKey: key,
  month: label,
  revenue:
    (monthlyRevenueMap[key]?.dealRevenue || 0) +
    (monthlyRevenueMap[key]?.soRevenue || 0),
  deals: monthlyRevenueMap[key]?.closedDeals || 0,
}));

console.log("DEBUG: monthlyRevenue FINAL", monthlyRevenue);




// Push into analytics state





      // Calculate analytics data
      const leadSourceCounts: Record<string, number> = {};
      leads.data?.forEach(lead => {
        leadSourceCounts[lead.source] = (leadSourceCounts[lead.source] || 0) + 1;
      });

      // Only count active deals for pie chart (exclude closed_won and closed_lost)
      const dealStageCounts: Record<string, number> = {};
      activeDeals.forEach(deal => {
        dealStageCounts[deal.stage] = (dealStageCounts[deal.stage] || 0) + 1;
      });

      // Cap conversion rate at 100%
      // Lead Conversion Rate: Qualified Leads / Total Leads
// Calculate lead conversion rate (only qualified)
const qualifiedLeadsCount = leads.data?.filter(l => l.status === "qualified").length || 0;

const conversionRate = leads.count
  ? Number(((qualifiedLeadsCount / leads.count) * 100).toFixed(1))
  : 0;

  // ---- Compute total revenue inside fetchStats ----







      const avgDealValue = wonDeals.length > 0
  ? (dashboardSummary.dealRevenue + dashboardSummary.salesOrderRevenue) / wonDeals.length
  : 0;


        setAnalyticsData({
  leadsBySource: Object.entries(leadSourceCounts).map(([name, value]) => ({
    name,
    value,
  })),

  dealsByStage: Object.entries(dealStageCounts).map(([name, value]) => ({
    name,
    value,
  })),

  monthlyRevenue,

  conversionRate,
  avgDealValue,
  activeCustomers: customers.count || 0,
});


      setStats({
  totalLeads: leads.count || 0,
  totalCustomers: customers.count || 0,
  totalDeals: activeDeals.length,
  wonDeals: wonDeals.length,
  pendingTasks: tasks.count || 0,
  pendingPayments: pendingPayCount || 0,
  overdueDeliveries: onHoldOrdersCount || 0,
});




      



      
      setUpcomingCalls(calls.data || []);

      // Fetch recent activities
      const activities = [];
      if (leads.data && leads.data.length > 0) {
        leads.data.slice(0, 3).forEach(lead => {
          activities.push({
            id: lead.id,
            type: "lead",
            description: `New lead: ${lead.name}`,
            time: new Date(lead.created_at).toLocaleString(),
            status: lead.status
          });
        });
      }
      if (deals.data && deals.data.length > 0) {
        deals.data.slice(0, 2).forEach(deal => {
          activities.push({
            id: deal.id,
            type: "deal",
            description: `Deal updated: ${deal.title}`,
            time: new Date(deal.updated_at).toLocaleString(),
            status: deal.stage
          });
        });
      }
      setRecentActivities(activities.sort((a, b) => 
        new Date(b.time).getTime() - new Date(a.time).getTime()
      ).slice(0, 5));
      // 🔹 BUILD DASHBOARD INSIGHTS
buildDashboardInsights({
  leads: leads.data || [],
  deals: deals.data || [],
  tasks: tasks.data || [],
  salesOrders: salesOrders || [],
  calls: calls.data || [],
});

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      
      setLoading(false);
    }
  };

  const quickActions = [
    {
      label: "Add New Lead",
      icon: Target,
      onClick: () => navigate("/dashboard/leads"),
    },
    {
      label: "Create Customer",
      icon: UserPlus,
      onClick: () => navigate("/dashboard/customers"),
    },
    {
      label: "Schedule Call",
      icon: Phone,
      onClick: () => navigate("/dashboard/calls"),
    },
    {
      label: "New Quotation",
      icon: FileText,
      onClick: () => navigate("/dashboard/quotations"),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg"><EduvancaLoader size={32} /></div>
      </div>
    );
  }

  


  return (
    <div className="space-y-6">
      <div className="p-8 rounded-xl shadow-lg" style={{ backgroundColor: "#F9423A" }}>
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-4xl font-bold text-white">
        Eduvanca One
      </h1>
      <p className="mt-2 text-lg text-white/90">
        Welcome back! Here's your business overview
      </p>
    </div>

    <div className="text-right">
      <div className="text-sm text-white/80">Current Date</div>
      <div className="text-lg font-semibold text-white">
        {new Date().toLocaleDateString()}
      </div>
    </div>
  </div>
</div>


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          icon={Target}
          className="hover:scale-105 transition-transform"
        />
        <StatCard
          title="Customers"
          value={stats.totalCustomers}
          icon={Users}
          className="hover:scale-105 transition-transform"
        />
        <StatCard
          title="Active Deals"
          value={stats.totalDeals}
          icon={TrendingUp}
          className="hover:scale-105 transition-transform"
        />
        <StatCard
          title="Won Deals"
          value={stats.wonDeals}
          icon={CheckCircle}
          className="hover:scale-105 transition-transform"
        />
        <StatCard
  title="Delivered Sales Orders"
  value={totalDeliveredSO}
  icon={Truck}
  className="hover:scale-105 transition-transform"
/>


        <StatCard
  title="Pending Purchase Orders"
  value={pendingPurchaseOrders}
  icon={FileText}
  className="hover:scale-105 transition-transform text-orange-600"
/>

        <StatCard
          title="Pending Tasks"
          value={stats.pendingTasks}
          icon={AlertCircle}
          className="hover:scale-105 transition-transform text-blue-600"
        />
        <StatCard
  title="Pending Payments"
  value={stats.pendingPayments}
  icon={AlertCircle}
  className="hover:scale-105 transition-transform text-red-600"
/>

<StatCard
  title="On-Hold Sales Orders"
  value={stats.overdueDeliveries}
  icon={Truck}
  className="hover:scale-105 transition-transform text-yellow-600"
/>


      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickActions actions={quickActions} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Meetings & Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming calls scheduled</p>
            ) : (
              upcomingCalls.map((call) => (
                <div key={call.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="font-medium text-sm">{call.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {new Date(call.scheduled_at).toLocaleString()}
                  </div>
                  <div className="text-xs text-primary mt-1 capitalize">{call.status}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingTasks limit={4} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
  {/* LEFT: Recent Activity */}
  <Card>
    <CardHeader>
      <CardTitle>Recent Activity</CardTitle>
    </CardHeader>
    <CardContent>
      <RecentActivity activities={recentActivities} />
    </CardContent>
  </Card>

  {/* RIGHT: Smart Insights */}
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
  <CardTitle>Business Insights</CardTitle>

  <button
    onClick={() => navigate("/dashboard/insights")}
    className="
      text-xs font-semibold
      bg-red-600 hover:bg-red-700
      text-white
      px-3 py-1.5
      rounded-md
      transition-colors
    "
  >
    View all insights
  </button>
</CardHeader>


    <CardContent className="space-y-3">
      {dashboardInsights.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No critical insights right now 🎉
        </p>
      ) : (
        dashboardInsights.map((insight, idx) => (
          <div
            key={idx}
            className={`rounded-lg p-3 text-sm flex flex-col gap-1
              ${
                insight.severity === "danger"
                  ? "bg-red-50 text-red-700"
                  : insight.severity === "warning"
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-blue-50 text-blue-700"
              }`}
          >
            <div className="flex justify-between font-semibold">
              <span>{insight.component}</span>
              <span className="text-xs">{insight.period}</span>
            </div>
            <div>{insight.message}</div>
          </div>
        ))
      )}
    </CardContent>
  </Card>
</div>


      <AdvancedAnalytics data={analyticsData} />
    </div>
  );
};

export default Dashboard;