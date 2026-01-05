import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { StickyNotes } from "@/components/StickyNotes";
import { Button } from "@/components/ui/button";
import { Calendar, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";
import { useState } from "react";
import { EduvancaGuideDialog } from "@/components/EduvancaGuideDialog";
import { Lightbulb } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useLocation } from "react-router-dom";
import { AiChatButton } from "@/components/ai/AiChatButton";
import { AiChatPanel } from "@/components/ai/AiChatPanel";




const BUSINESS_TIPS = [
  "Follow up unpaid invoices within 48 hours to increase collections.",
  "Track discounts separately — they silently reduce profit.",
  "Customers contacted within 1 hour convert 7x more.",
  "Delivered orders should be invoiced the same day.",
  "Low stock alerts prevent last-minute order loss.",
  "Repeat customers cost 5x less than new ones.",
  "Always confirm payment terms before delivery.",
  "Track profit per order, not just total revenue.",
  "Weekly review of pending payments improves cash flow.",
  "High discounts often hide pricing mistakes.",
  "Send invoices immediately after order confirmation.",
  "Shorter payment cycles improve business stability.",
  "Inactive customers should be re-contacted every 30 days.",
  "Avoid changing order status without stock check.",
  "Bundled products increase average order value.",
  "Customers trust clear GST breakdowns.",
  "Late deliveries reduce repeat purchases.",
  "Track cost price updates monthly.",
  "High sales with low profit is a warning sign.",
  "Automate reminders for overdue payments.",
  "Focus on top 20% customers — they drive 80% revenue.",
  "Clear invoices reduce payment disputes.",
  "Always log discounts with a reason.",
  "Track daily revenue trends, not just monthly.",
  "Small delays in invoicing cause big delays in payment.",
  "Regular follow-ups feel professional, not pushy.",
  "Maintain clean customer records.",
  "Profit visibility helps better pricing decisions.",
  "Avoid overstocking slow-moving products.",
  "Consistency in follow-ups builds trust.",
];


function getTimeGreeting() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Weekend
  if (day === 0 || day === 6) {
    return "Relax 😌 You’ve earned it";
  }

  // Friday evening
  if (day === 5 && hour >= 17 && hour < 19) {
    return "It’s Friday 🎉 Enjoy your weekend";
  }

  // Monday morning special
  if (day === 1 && hour >= 8 && hour < 10) {
    return "Good morning ☀️ Back to basics, back to growth";
  }

  // Regular weekday slots
  if (hour >= 8 && hour < 10) return "Good morning ☀️ Let’s start fresh";
  if (hour >= 10 && hour < 11) return "Tea break? ☕ Then back stronger";
  if (hour >= 11 && hour < 13) return "Deep focus time 🚀 You got this";
  if (hour >= 13 && hour < 14.5) return "Lunch time 🍽️ Refuel yourself";
  if (hour >= 14.5 && hour < 16.5) return "Back to work 💼 Let’s finish strong";
  if (hour >= 16.5 && hour < 17) return "Coffee break ☕ Small pause helps";
  if (hour >= 17 && hour < 19) return "Good evening 🌆 Wrap things calmly";

  return null; // outside business hours → show nothing
}




const DashboardLayout = () => {
  const navigate = useNavigate();
  const [infoOpen, setInfoOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [showReconnectPopup, setShowReconnectPopup] = useState(false);
const [open, setOpen] = useState(false);
const [timeGreeting, setTimeGreeting] = useState<string | null>(null);

useEffect(() => {
  const updateGreeting = () => {
    setTimeGreeting(getTimeGreeting());
  };

  updateGreeting();
  const interval = setInterval(updateGreeting, 60 * 1000); // update every minute

  return () => clearInterval(interval);
}, []);




  useEffect(() => {
    // Check authentication
   const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    navigate("/auth");
    return;
  }

  const { data } = await supabase
    .from("company_settings")
    .select("company_name")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (data?.company_name) {
    setCompanyName(data.company_name);
  }
};


    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
const todayIndex = daysSinceEpoch % BUSINESS_TIPS.length;
const todaysTip = BUSINESS_TIPS[todayIndex];

const location = useLocation();
const isReportsPage = location.pathname.includes("/dashboard/reports");

const connectionStatus = useConnectionStatus();

useEffect(() => {
  if (connectionStatus === "reconnecting") {
    setShowReconnectPopup(true);
  }

  if (connectionStatus === "online") {
    setShowReconnectPopup(false);
  }
}, [connectionStatus]);



  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden">
          <div
  className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
    ${isReportsPage ? "relative" : "sticky top-0 z-50"}
  `}
>

            <div className="flex h-14 items-center justify-between px-4">
              <SidebarTrigger className="-ml-1 md:hidden" />
              {timeGreeting && (
  <span
    className="
      inline-flex items-center gap-1
    px-3 py-1
    rounded-full
    text-xs font-medium
    text-orange-700
    bg-orange-500/10
    border border-orange-500/20
    "
  >
    {timeGreeting}
  </span>
)}

              
              {/* RIGHT SIDE CONTAINER */}
<div className="flex items-center gap-3 ml-auto max-w-full overflow-hidden">

  {/* ICON GROUP – NEVER CUT */}
  <div className="flex items-center gap-2 shrink-0">
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          title="Business Tip of the Day"
        >
          <Lightbulb className="h-5 w-5 text-yellow-500" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        className="w-72 rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-md"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            <h4 className="text-sm font-semibold text-yellow-800">
              Tip of the Day
            </h4>
          </div>
          <p className="text-sm text-yellow-900 leading-relaxed">
            {todaysTip}
          </p>
          <p className="text-xs text-yellow-700 italic">
            Small improvements compound into big growth.
          </p>
        </div>
      </PopoverContent>
    </Popover>

    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("/dashboard/calendar")}
      className="h-9 w-9 p-0"
      title="Calendar"
    >
      <Calendar className="h-5 w-5" />
    </Button>

    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        const event = new CustomEvent("open-sticky-notes");
        window.dispatchEvent(event);
      }}
      className="h-9 w-9 p-0"
      title="Sticky Notes"
    >
      <StickyNote className="h-5 w-5" />
    </Button>

    <Button
      variant="ghost"
      size="sm"
      onClick={() => setGuideOpen(true)}
      className="h-9 w-9 p-0"
      title="User Guide"
    >
      <Info className="h-5 w-5 text-blue-600" />
    </Button>

    <EduvancaGuideDialog open={guideOpen} onOpenChange={setGuideOpen} />
  </div>

  <div className="hidden md:flex items-center gap-2 text-xs font-medium">
    {connectionStatus === "reconnecting" && showReconnectPopup && (
  <div className="absolute right-4 top-14 z-50 w-80 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-lg">
    <div className="flex items-start gap-3">
      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />

      <div className="flex-1">
        <p className="text-sm font-semibold text-yellow-800">
          Reconnecting…
        </p>
        <p className="mt-0.5 text-xs text-yellow-700">
          Trying to restore your internet connection.
        </p>
      </div>

      <button
        onClick={() => setShowReconnectPopup(false)}
        className="text-yellow-400 hover:text-yellow-600 transition"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  </div>
)}

  {connectionStatus === "online" && (
    <span className="flex items-center gap-1 text-green-600">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      Online
    </span>
  )}

  {connectionStatus === "reconnecting" && (
    <span className="flex items-center gap-1 text-yellow-600">
      <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
      Reconnecting
    </span>
  )}

  {connectionStatus === "offline" && (
    <span className="flex items-center gap-1 text-red-600">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Offline
    </span>
  )}
</div>


  {/* COMPANY NAME – EXTREME RIGHT */}
  {companyName && (
  <div className="hidden md:flex shrink-0">
    <span
      className="
        px-4 py-1
        rounded-full
        text-xs font-semibold
        text-yellow-900
        border border-yellow-300
        shadow-sm
        whitespace-nowrap
        tracking-wide

        bg-[linear-gradient(110deg,#facc15,#fde68a,#f59e0b,#fde68a,#facc15)]
        premium-gold
      "
      title="Company Name"
    >
      {companyName}
    </span>
  </div>
)}




</div>

            </div>
          </div>
          <div className="h-[calc(100vh-3.5rem)] overflow-y-auto p-4 md:p-6">
  <Outlet />
</div>

        </main>
      </div>
            {/* AI CHATBOT – GLOBAL FLOATING UI */}
      <AiChatButton onClick={() => setOpen(true)} />
      {open && <AiChatPanel onClose={() => setOpen(false)} />}

      <StickyNotes />
    </SidebarProvider>

  );
};

export default DashboardLayout;