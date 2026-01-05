import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const TodayPerformance = () => {
  const [sales, setSales] = useState(0);
  const [followUps, setFollowUps] = useState(0);
  const [newLeads, setNewLeads] = useState(0);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Sales today
    const { data } = await supabase
      .from("sales_orders")
      .select("total_amount")
      .eq("order_date", today);

    const total = data?.reduce((t, s) => t + s.total_amount, 0) || 0;
    setSales(total);

    // Follow-ups
    const { count: fu } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("updated_at", today);

    setFollowUps(fu || 0);

    // New leads today
    const { count: ld } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today + "T00:00:00")
      .lte("created_at", today + "T23:59:59");

    setNewLeads(ld || 0);
  };

  return (
    <div className="p-4 border rounded-lg space-y-3">
      <h3 className="text-lg font-semibold">Today's Performance</h3>

      <p>Sales Today: <b>₹{sales}</b></p>
      <p>Follow-ups Due Today: <b>{followUps}</b></p>
      <p>New Leads Today: <b>{newLeads}</b></p>
    </div>
  );
};
