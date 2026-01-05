import { useEffect, useState } from "react";
import GaugeChart from "react-gauge-chart";
import { supabase } from "@/integrations/supabase/client";

export const ProductivityMeter = () => {
  const [callsDone, setCallsDone] = useState(0);
  const [callsTotal, setCallsTotal] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Completed calls
    const { count: done } = await supabase
      .from("calls")
      .select("*", { count: "exact" })
      .gte("scheduled_at", `${today}T00:00:00`)
      .lte("scheduled_at", `${today}T23:59:59`)
      .eq("status", "completed");

    setCallsDone(done || 0);

    // Total calls
    const { count: total } = await supabase
      .from("calls")
      .select("*", { count: "exact" })
      .gte("scheduled_at", `${today}T00:00:00`)
      .lte("scheduled_at", `${today}T23:59:59`);

    setCallsTotal(total || 0);

    // Tasks completed today
    const { count: tdone } = await supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .eq("status", "completed")
      .gte("updated_at", `${today}T00:00:00`)
      .lte("updated_at", `${today}T23:59:59`);

    setTasksDone(tdone || 0);
  };

  const base = callsTotal > 0 ? callsDone / callsTotal : 0;
  const productivity =
    tasksDone > 0
      ? Math.min(base * 0.7 + 0.3, 1)
      : base;

  const getTextColor = () => {
    if (productivity < 0.4) return "#ff4d4d";
    if (productivity < 0.75) return "#ffcc00";
    return "#28a745";
  };

  return (
    <div
      className="p-6 border rounded-xl shadow-sm bg-white relative"
      style={{ height: "260px" }}
    >
      <h3 className="text-xl font-bold mb-4 text-center">Productivity Meter</h3>

      <svg width="0" height="0">
        <defs>
          <linearGradient id="meterGradient">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="50%" stopColor="#ffcc00" />
            <stop offset="100%" stopColor="#28a745" />
          </linearGradient>
        </defs>
      </svg>

      <style>
        {`
          #prod-meter .gauge-arc {
            stroke: url(#meterGradient) !important;
          }
          #prod-meter .gauge-needle {
            display: none !important;
          }
        `}
      </style>

      <GaugeChart
        id="prod-meter"
        nrOfLevels={1}
        arcsLength={[1]}
        arcWidth={0.22}
        percent={productivity}
        hideText={true}
        colors={["#ddd"]} 
        cornerRadius={4}
        needleColor="transparent"
        style={{ width: "100%" }}
      />

      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <span
          style={{
            fontSize: "42px",
            fontWeight: "700",
            color: getTextColor(),
          }}
        >
          {Math.round(productivity * 100)}%
        </span>
      </div>
    </div>
  );
};
