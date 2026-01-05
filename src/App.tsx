import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./pages/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Customers from "./pages/Customers";
import Pipeline from "./pages/Pipeline";
import Tasks from "./pages/Tasks";
import Quotations from "./pages/Quotations";
import Profile from "./pages/Profile";
import Products from "./pages/Products";
import Vendors from "./pages/Vendors";
import PriceBooks from "./pages/PriceBooks";
import SalesOrders from "./pages/SalesOrders";
import PurchaseOrders from "./pages/PurchaseOrders";
import Calls from "./pages/Calls";
import Reports from "./pages/Reports";
import CompanySettings from "./pages/CompanySettings";
import Employees from "./pages/hr/Employees";
import Departments from "./pages/hr/Departments";
import Attendance from "./pages/hr/Attendance";
import Leave from "./pages/hr/Leave";
import Payroll from "./pages/hr/Payroll";
import DailyLogs from "./pages/DailyLogs";
import Analytics from "./pages/Analytics";
import Papers from "./pages/Papers";
import Tickets from "./pages/Tickets";
import Calendar from "./pages/Calendar";
import NotFound from "./pages/NotFound";
import { InventoryStockApproval } from "./components/InventoryStockApproval";
import FormEmbedIntegration from "./pages/FormEmbedIntegration";
import { GlobalLoaderProvider } from "./context/GlobalLoaderContext";
import { supabase } from "./lib/supabase";
import { useEffect } from "react";
import Insights from "./pages/Insights";
import Onboarding from "./pages/Onboarding";
import { useQueryClient } from "@tanstack/react-query";



//const queryClient = new QueryClient();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min fresh
      gcTime: 10 * 60 * 1000,   // ✅ v5 replacement for cacheTime
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});



function SessionTracker() {
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let lastActive = Date.now();
    let currentUserId: string | null = null;

    const startTracking = (userId: string) => {
      if (interval) clearInterval(interval);

      interval = setInterval(async () => {
        const now = Date.now();
        const diffSec = Math.floor((now - lastActive) / 1000);
        lastActive = now;

        if (diffSec < 10) return;

        const { error: rpcError } = await (supabase as any).rpc(
  "upsert_user_session",
  {
    p_user_id: userId,
    p_date: new Date().toISOString().split("T")[0],
    p_seconds: diffSec,
  }
);

if (rpcError) {
  console.error("Session RPC failed:", rpcError);
} else {
  console.log("Session saved:", diffSec);
}

      }, 15000);
    };

    const stopTracking = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          currentUserId = session.user.id;
          lastActive = Date.now();
          startTracking(currentUserId);
        } else {
          stopTracking();
        }
      }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopTracking();
      else if (currentUserId) startTracking(currentUserId);
    });

    return () => {
      stopTracking();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}

function SupabaseRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("global-realtime-cache")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        () => {
          // 🔥 Refresh all cached data instantly
          queryClient.invalidateQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}


function OnboardingGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      // Never block onboarding page itself
      if (window.location.pathname === "/onboarding") return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("company_settings")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Onboarding check failed", error);
        return;
      }

      // If no row OR onboarding false → force onboarding
      if (!data || data.onboarding_completed !== true) {
        navigate("/onboarding", { replace: true });
      }
    };

    check();
  }, [navigate]);

  return null;
}





const App = () => (
  <QueryClientProvider client={queryClient}>
  <SessionTracker />
  <SupabaseRealtimeSync />
    <GlobalLoaderProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <OnboardingGuard />
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="form-integration" element={<FormEmbedIntegration />} />
            <Route path="inventory-approval" element={<div className="p-6"><InventoryStockApproval /></div>} />
            <Route path="leads" element={<Leads />} />
            <Route path="customers" element={<Customers />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="quotations" element={<Quotations />} />

            <Route path="products" element={<Products />} />
            <Route path="vendors" element={<Vendors />} />
            <Route path="price-books" element={<PriceBooks />} />
            <Route path="sales-orders" element={<SalesOrders />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="calls" element={<Calls />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="reports" element={<Reports />} />
            <Route path="hr/employees" element={<Employees />} />
            <Route path="hr/departments" element={<Departments />} />
            <Route path="hr/attendance" element={<Attendance />} />
            <Route path="hr/leave" element={<Leave />} />
            <Route path="hr/payroll" element={<Payroll />} />
            <Route path="daily-logs" element={<DailyLogs />} />
            <Route path="monthly-analytics" element={<Analytics />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="papers" element={<Papers />} />
            <Route path="company-settings" element={<CompanySettings />} />
            <Route path="settings" element={<CompanySettings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="insights" element={<Insights />} />

            
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </GlobalLoaderProvider>
  </QueryClientProvider>
);

export default App;
