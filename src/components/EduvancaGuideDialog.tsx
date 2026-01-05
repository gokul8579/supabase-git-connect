import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";

interface GuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PromoBanner = ({
  onCTAClick,
}: {
  onCTAClick?: () => void;
}) => {
  return (
    <div className="mt-6">
      <div className="relative overflow-hidden rounded-xl shadow-md">

        {/* BRAND BACKGROUND */}
        <div style={{ backgroundColor: "#F9423A" }} className="p-6 md:p-8">

          <div className="flex gap-6 items-center">

            {/* LOGO IMAGE INSTEAD OF "E" */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
                 <img 
    src="/logo.png" 
    alt="Eduvanca Logo" 
    className="w-14 h-14 object-contain drop-shadow" 
  />
              </div>
            </div>

            {/* TEXT CONTENT */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-xl md:text-2xl leading-tight">
                Grow Your Business With Eduvanca SaaS Suite
              </div>

              <div className="text-white/90 mt-1 text-sm md:text-base">
                CRM, Billing, Inventory, HRMS, and Automation — All in one powerful system.
              </div>

              {/* CTA BUTTON */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() =>
                    onCTAClick
                      ? onCTAClick()
                      : window.open("https://eduvanca.com", "_blank")
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 shadow-sm hover:shadow-md text-[#F9423A] font-semibold"
                >
                  Explore Eduvanca Suite
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14"
                      stroke="#F9423A"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 5l7 7-7 7"
                      stroke="#F9423A"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              
            </div>
          </div>
        </div>

        {/* Sweep animation keyframes */}
        <style>{`
          @keyframes sweep {
            0% { transform: translateX(-120%); }
            50% { transform: translateX(20%); }
            100% { transform: translateX(120%); }
          }
        `}</style>
      </div>
    </div>
  );
};


export const EduvancaGuideDialog = ({ open, onOpenChange }: GuideDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-2xl shadow-2xl border">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <Info className="h-6 w-6 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-bold">Eduvanca CRM – Full Guide & Documentation</DialogTitle>
          </div>
        </DialogHeader>

        <Separator />

        {/* SCROLLABLE AREA */}
        <ScrollArea className="px-6 py-5 h-[75vh]">
          <div className="space-y-10 pb-10">

            {/* SECTION: TOP PRIORITY */}
            <div>
              <h2 className="text-2xl font-bold text-black">🔥 Top Priority System Logics (Read First!)</h2>
              <p className="text-gray-600 mt-1">Internal calculations and hidden mechanisms powering the CRM.</p>
              <PromoBanner />


              <div className="mt-5 space-y-6">

                {/* Bill Settings */}
                <div className="bg-white border rounded-xl p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-red-600">1. Bill Settings Logic</h3>
                  <ul className="list-disc pl-6 text-gray-700 mt-3 space-y-1">
                    <li>Handles GST (CGST, SGST, IGST, or No Tax).</li>
                    <li>Tax auto-calculation applies to Quotations, SO, Deals.</li>
                    <li>Closed Won Deals → Tax contributes to Report tax collected.</li>
                    <li>Profit excludes service charges (fixed).</li>
                    <li>Rounding follows Indian currency style.</li>
                  </ul>
                </div>

                {/* PO Auto Increment */}
                <div className="bg-white border rounded-xl p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-red-600">2. Purchase Order Auto-Increment Logic</h3>
                  <ul className="list-disc pl-6 text-gray-700 mt-3 space-y-1">
                    <li>Stock increases automatically when PO is completed.</li>
                    <li>Cost price updates to latest purchase cost.</li>
                  </ul>
                </div>

                {/* Reports Logic */}
                <div className="bg-white border rounded-xl p-5 shadow-sm">
                  <h3 className="text-xl font-bold text-red-600">3. Reports Logic</h3>
                  <ul className="list-disc pl-6 text-gray-700 mt-3 space-y-1">
                    <li>SO Revenue = Delivered + Paid orders only.</li>
                    <li>Deals Revenue excludes service charges.</li>
                    <li>Total Profit = SO Profit + Deal Profit.</li>
                    <li>Tax collected includes SO + Closed Won deals.</li>
                  </ul>
                </div>

              </div>
            </div>

            <Separator />

            {/* SECTION: MODULE GUIDE */}
            <div>
              <h2 className="text-2xl font-bold text-black">📘 Module-by-Module Full Guide</h2>

              <div className="space-y-8 mt-6">

                {/* Dashboard */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Dashboard</h3>
                  <p className="text-gray-700 mt-2">Shows all summarized metrics across CRM with auto-refresh.</p>
                </div>

                {/* Leads */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Leads Module</h3>
                  <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
                    <li>Capture leads and assign owners.</li>
                    <li>Convert leads → customers instantly.</li>
                    <li>Changing lead stage updates analytics.</li>
                  </ul>
                </div>

                {/* Customers */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Customers</h3>
                  <p className="text-gray-700 mt-2">Auto-linked with deals & SO for full CRM visibility.</p>
                </div>

                {/* Pipeline */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Sales Pipeline (Deals)</h3>
                  <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
                    <li>Tracks all opportunities.</li>
                    <li>Closed Won triggers revenue, profit & tax calculation.</li>
                    <li>Deal items work like sales order items.</li>
                  </ul>
                </div>

                {/* Products */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Products</h3>
                  <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
                    <li>Stores prices, GST %, and stock.</li>
                    <li>Stock auto-updated through PO module.</li>
                    <li>Cost price updated on every PO completion.</li>
                  </ul>
                </div>

                {/* Purchase Orders */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Purchase Orders</h3>
                  <p className="text-gray-700 mt-2">Important: Stock & cost price adjustments happen only when PO is marked complete.</p>
                </div>

                {/* Sales Orders */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Sales Orders</h3>
                  <ul className="list-disc pl-6 text-gray-700 mt-2 space-y-1">
                    <li>Add items, apply GST, add service charges.</li>
                    <li>Revenue counted only when Delivered + Paid.</li>
                    <li>Service charge excluded from profit.</li>
                  </ul>
                </div>

                {/* Daily Logs */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Daily Logs</h3>
                  <p className="text-gray-700 mt-2">
                    Tracks daily metrics including sales, expenses, cash, purchases, and notes with auto previous-day reference.
                  </p>
                </div>

                {/* Reports */}
                <div className="bg-gray-50 border rounded-xl p-5">
                  <h3 className="text-xl font-bold text-red-600">Reports</h3>
                  <p className="text-gray-700 mt-2">Dynamic, filter-based and auto-calculated using sales orders + deals.</p>
                </div>

              </div>
            </div>

            <Separator />

            {/* INTERNAL MAINTENANCE */}
            <div>
              <h2 className="text-2xl font-bold text-black">🧨 Internal Developer Notes</h2>

              <div className="bg-white border rounded-xl p-5 shadow-sm mt-4">
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Critical tables: leads, customers, deals, deal_items, sales_orders, purchase_orders, daily_logs, products.</li>
                  <li>Cost price always updated from PO.</li>
                  <li>Deal value must match items for accurate reports.</li>
                  <li>Global loader replaces text loader everywhere.</li>
                </ul>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
