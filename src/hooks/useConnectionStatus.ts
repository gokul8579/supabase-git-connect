import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "online" | "reconnecting" | "offline";

export function useConnectionStatus() {
  const [status, setStatus] = useState<Status>(
    navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    const setOffline = () => setStatus("offline");
    const setOnline = () => setStatus("reconnecting");

    window.addEventListener("offline", setOffline);
    window.addEventListener("online", setOnline);

    let interval: any;

    async function pingBackend() {
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }

      try {
        const { error } = await supabase
          .from("company_settings")
          .select("id")
          .limit(1);

        setStatus(error ? "reconnecting" : "online");
      } catch {
        setStatus("reconnecting");
      }
    }

    pingBackend(); // initial
    interval = setInterval(pingBackend, 15000); // every 15s

    return () => {
      window.removeEventListener("offline", setOffline);
      window.removeEventListener("online", setOnline);
      clearInterval(interval);
    };
  }, []);

  return status;
}
