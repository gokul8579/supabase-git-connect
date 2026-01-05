import { supabase } from "@/integrations/supabase/client";
import { ActivitiesAnalytics } from "./reports.types";

/* ======================================================
   ACTIVITY ANALYTICS
====================================================== */

export async function getActivityAnalytics(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<ActivitiesAnalytics> {
  const applyDate = (q: any, col: string) => {
    if (!startDate || !endDate) return q;
    return q
      .gte(col, startDate + "T00:00:00")
      .lte(col, endDate + "T23:59:59");
  };

  /* ------------------------------------------------------
     FETCH ACTIVITIES
  ------------------------------------------------------ */

  const { data: activities } = await applyDate(
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", userId),
    "created_at"
  );

  const acts = activities || [];

  if (acts.length === 0) {
    return {
      summary: {
        totalActivities: 0,
        completed: 0,
        pending: 0,
      },
      byType: [],
      dailyTrend: [],
    };
  }

  /* ------------------------------------------------------
     SUMMARY
  ------------------------------------------------------ */

  const totalActivities = acts.length;
  const completed = acts.filter(a => a.status === "completed").length;
  const pending = totalActivities - completed;

  /* ------------------------------------------------------
     ACTIVITY BY TYPE
  ------------------------------------------------------ */

  const typeMap: Record<string, number> = {};

  acts.forEach(a => {
    const type = a.activity_type || "unknown";
    typeMap[type] = (typeMap[type] || 0) + 1;
  });

  const byType = Object.entries(typeMap).map(
    ([name, value]) => ({ name, value })
  );

  /* ------------------------------------------------------
     DAILY ACTIVITY TREND
  ------------------------------------------------------ */

  const dailyMap: Record<string, number> = {};

  acts.forEach(a => {
    const day = a.created_at
      ? new Date(a.created_at).toISOString().split("T")[0]
      : null;

    if (!day) return;

    dailyMap[day] = (dailyMap[day] || 0) + 1;
  });

  const dailyTrend = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  /* ------------------------------------------------------
     FINAL RETURN
  ------------------------------------------------------ */

  return {
    summary: {
      totalActivities,
      completed,
      pending,
    },
    byType,
    dailyTrend,
  };
}
