import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface StaffAccount {
  id: string;
  admin_user_id: string;
  staff_user_id: string;
  staff_email: string;
  staff_name: string;
  is_active: boolean;
  allowed_modules: string[];
}

interface StaffContextType {
  user: User | null;
  isAdmin: boolean;
  isStaff: boolean;
  staffAccount: StaffAccount | null;
  allowedModules: string[];
  effectiveUserId: string | null; // The user_id to use for data queries
  hasModuleAccess: (module: string) => boolean;
  loading: boolean;
}

const StaffContext = createContext<StaffContextType>({
  user: null,
  isAdmin: true,
  isStaff: false,
  staffAccount: null,
  allowedModules: [],
  effectiveUserId: null,
  hasModuleAccess: () => true,
  loading: true,
});

export const useStaff = () => useContext(StaffContext);

// All available modules in the system
export const ALL_MODULES = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "leads", label: "Leads", icon: "UserPlus" },
  { id: "customers", label: "Customers", icon: "Users" },
  { id: "pipeline", label: "Pipeline", icon: "GitBranch" },
  { id: "quotations", label: "Quotations", icon: "FileText" },
  { id: "sales_orders", label: "Sales Orders", icon: "ShoppingCart" },
  { id: "products", label: "Products", icon: "Package" },
  { id: "vendors", label: "Vendors", icon: "Truck" },
  { id: "purchase_orders", label: "Purchase Orders", icon: "ClipboardList" },
  { id: "tickets", label: "Tickets", icon: "Ticket" },
  { id: "contracts", label: "Contracts", icon: "FileSignature" },
  { id: "tasks", label: "Tasks", icon: "CheckSquare" },
  { id: "calls", label: "Calls & Meetings", icon: "Phone" },
  { id: "calendar", label: "Calendar", icon: "Calendar" },
  { id: "hr", label: "HR Module", icon: "Users" },
  { id: "analytics", label: "Analytics", icon: "BarChart" },
  { id: "reports", label: "Reports", icon: "FileBarChart" },
  { id: "insights", label: "Insights", icon: "Lightbulb" },
  { id: "papers", label: "Papers", icon: "Files" },
  { id: "daily_logs", label: "Daily Logs", icon: "BookOpen" },
  { id: "price_books", label: "Price Books", icon: "Book" },
];

export const StaffProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStaffStatus = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("staff_accounts")
          .select("*")
          .eq("staff_user_id", userId)
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;
        setStaffAccount(data as StaffAccount | null);
      } catch (error) {
        console.error("Error checking staff status:", error);
        setStaffAccount(null);
      }
    };

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Use setTimeout to prevent potential deadlock
        setTimeout(() => {
          checkStaffStatus(session.user.id);
        }, 0);
      } else {
        setStaffAccount(null);
      }
      setLoading(false);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkStaffStatus(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isStaff = !!staffAccount;
  const isAdmin = !isStaff && !!user;
  const allowedModules = staffAccount?.allowed_modules || [];
  const effectiveUserId = staffAccount?.admin_user_id || user?.id || null;

  const hasModuleAccess = (module: string): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    return allowedModules.includes(module);
  };

  return (
    <StaffContext.Provider
      value={{
        user,
        isAdmin,
        isStaff,
        staffAccount,
        allowedModules,
        effectiveUserId,
        hasModuleAccess,
        loading,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
};