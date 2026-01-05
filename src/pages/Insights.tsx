import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  TrendingUp,
  Package,
  Users,
  BadgeIndianRupee,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import { formatIndianCurrency } from "@/lib/formatUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EduvancaLoader } from "@/components/EduvancaLoader";
import { Separator } from "@/components/ui/separator";

type Severity = "info" | "warning" | "danger";

interface Insight {
  severity: Severity;
  period: string;
  message: string;
  actionLabel?: string;
}

type ComponentInsights = Record<
  string,
  { insights: Insight[]; icon: JSX.Element }
>;

const severityStyle: Record<Severity, string> = {
  danger: "bg-red-50/50 text-red-700 border-red-100",
  warning: "bg-amber-50/50 text-amber-700 border-amber-100",
  info: "bg-blue-50/50 text-blue-700 border-blue-100",
};

const Insights = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [componentInsights, setComponentInsights] =
    useState<ComponentInsights>({});

  useEffect(() => {
    loadAdvancedInsights();
  }, []);

  const loadAdvancedInsights = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const [
        leads,
        deals,
        tasks,
        salesOrders,
        products,
        quotations,
        attendance,
      ] = await Promise.all([
        supabase.from("leads").select("*").eq("user_id", user.id),
        supabase.from("deals").select("*").eq("user_id", user.id),
        supabase.from("tasks").select("*").eq("user_id", user.id),
        supabase.from("sales_orders").select("*").eq("user_id", user.id),
        supabase.from("products").select("*").eq("user_id", user.id),
        supabase.from("quotations").select("*").eq("user_id", user.id),
        supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", new Date().toISOString().split("T")[0]),
      ]);

      const insights: ComponentInsights = {
        "Sales & Revenue": {
          icon: <BadgeIndianRupee className="h-5 w-5 text-emerald-600" />,
          insights: [],
        },
        "Inventory Health": {
          icon: <Package className="h-5 w-5 text-blue-600" />,
          insights: [],
        },
        "Deals & Pipelines": {
          icon: <TrendingUp className="h-5 w-5 text-indigo-600" />,
          insights: [],
        },
        "Workforce & Execution": {
          icon: <Users className="h-5 w-5 text-orange-600" />,
          insights: [],
        },
        "Tasks & Follow-ups": {
          icon: <CalendarClock className="h-5 w-5 text-rose-600" />,
          insights: [],
        },
      };

      /* ---------------- SALES & REVENUE ---------------- */

      const unpaidDelivered = (salesOrders.data || []).filter(
        (o) =>
          ["delivered", "shipped"].includes(o.status) &&
          o.payment_status !== "paid"
      );

      if (unpaidDelivered.length) {
        const amt = unpaidDelivered.reduce(
          (s, o) => s + Number(o.total_amount || 0),
          0
        );
        insights["Sales & Revenue"].insights.push({
          severity: "danger",
          period: "Cashflow Risk",
          message: `₹${formatIndianCurrency(
            amt
          )} stuck in delivered but unpaid orders.`,
          actionLabel: "Follow Up Payments",
        });
      }

      const sentQuotes = (quotations.data || []).filter(
        (q) => q.status === "sent"
      );
      const quoteValue = sentQuotes.reduce(
        (s, q) => s + Number(q.total_amount || 0),
        0
      );

      if (quoteValue > 0) {
        insights["Sales & Revenue"].insights.push({
          severity: "warning",
          period: "Revenue Opportunity",
          message: `₹${formatIndianCurrency(
            quoteValue
          )} pending in sent quotations.`,
          actionLabel: "Convert Quotes",
        });
      }

      /* ---------------- INVENTORY ---------------- */

      const lowStock = (products.data || []).filter(
        (p) => (p.quantity_in_stock || 0) <= (p.reorder_level || 0)
      );

      if (lowStock.length) {
        insights["Inventory Health"].insights.push({
          severity: "danger",
          period: "Stock Alert",
          message: `${lowStock.length} products below reorder level.`,
          actionLabel: "Restock Items",
        });
      }

      const deadStock = (products.data || []).filter(
        (p) =>
          p.quantity_in_stock > 0 &&
          new Date(p.updated_at).getTime() <
            Date.now() - 30 * 24 * 60 * 60 * 1000
      );

      if (deadStock.length) {
        insights["Inventory Health"].insights.push({
          severity: "warning",
          period: "Dead Stock",
          message: `${deadStock.length} items not moved in 30+ days.`,
          actionLabel: "Run Clearance",
        });
      }

      /* ---------------- DEALS ---------------- */

      const stuckDeals = (deals.data || []).filter(
        (d) =>
          !["closed_won", "closed_lost"].includes(d.stage) &&
          new Date(d.updated_at).getTime() <
            Date.now() - 14 * 24 * 60 * 60 * 1000
      );

      if (stuckDeals.length) {
        insights["Deals & Pipelines"].insights.push({
          severity: "danger",
          period: "Pipeline Risk",
          message: `${stuckDeals.length} deals inactive for over 14 days.`,
          actionLabel: "Revive Deals",
        });
      }

      /* ---------------- TASKS ---------------- */

      const overdueTasks = (tasks.data || []).filter(
        (t) => t.due_date && new Date(t.due_date) < new Date()
      );

      if (overdueTasks.length) {
        insights["Tasks & Follow-ups"].insights.push({
          severity: "warning",
          period: "Execution Lag",
          message: `${overdueTasks.length} tasks overdue.`,
          actionLabel: "Fix Tasks",
        });
      }

      /* ---------------- WORKFORCE ---------------- */

      const absent = (attendance.data || []).filter(
        (a) => a.status === "absent"
      );

      if (absent.length) {
        insights["Workforce & Execution"].insights.push({
          severity: "info",
          period: "Today",
          message: `${absent.length} employees absent today.`,
        });
      }

      setComponentInsights(insights);
    } catch (err) {
      console.error("Insights error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <EduvancaLoader size={40} />
      </div>
    );

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Smart Insights
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Actionable business intelligence based on real data.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={loadAdvancedInsights}>
            Refresh
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            Generate Report
          </Button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(componentInsights).map(([title, data]) => (
          <Card key={title} className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row justify-between pb-4">
              <div className="flex gap-3 items-center">
                <div className="p-2 bg-slate-50 rounded-lg">{data.icon}</div>
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <Badge variant="secondary">{data.insights.length} Alerts</Badge>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 space-y-4">
              {data.insights.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">
                  Everything looks good here 🎉
                </p>
              ) : (
                data.insights.map((i, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 ${severityStyle[i.severity]}`}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold opacity-70">
                        {i.period}
                      </span>
                      {i.severity === "danger" && (
                        <AlertCircle className="h-4 w-4" />
                      )}
                    </div>
                    <p className="text-sm font-medium">{i.message}</p>
                    {i.actionLabel && (
                      <button className="mt-2 flex items-center text-xs font-bold hover:underline">
                        {i.actionLabel}{" "}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Insights;
