import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------- 1. SETUP & CORS ---------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ---------------- 2. INTENT PARSER ---------------- */
function parsePrompt(prompt: string) {
  const p = prompt.toLowerCase();
  
  // Helper to check regex
  const has = (r: RegExp) => r.test(p);

  return {
    // --- CRM ---
    wantsLeads: has(/lead|prospect|enquiry/),
    wantsCustomers: has(/customer|client/),
    wantsActivities: has(/activity|interaction|history/),
    wantsCalls: has(/call|phone|conversation/),
    wantsTasks: has(/task|todo|follow/),
    
    // --- Sales ---
    wantsDeals: has(/deal|opportunity|pipeline/),
    wantsQuotations: has(/quote|quotation|estimate/),
    wantsSalesOrders: has(/sales order|so\b|order/),
    wantsRevenue: has(/revenue|income|profit|money|finance/),
    
    // --- Procurement ---
    wantsPurchaseOrders: has(/purchase order|po\b|procurement|buy/),
    wantsVendors: has(/vendor|supplier/),
    
    // --- Inventory ---
    wantsProducts: has(/product|item|sku|stock|quantity/),
    wantsWarehouses: has(/warehouse|location|storage/),
    wantsStockApproval: has(/stock approval|movement|audit/),
    wantsPriceBooks: has(/price book|pricing|list price/),
    wantsCatalogues: has(/catalogue|catalog|category/),
    
    // --- HR ---
    wantsEmployees: has(/employee|staff|personnel|worker/),
    wantsDepartments: has(/department|dept|team/),
    wantsAttendance: has(/attendance|present|absent|check-in|check in/),
    wantsLeaves: has(/leave|vacation|sick|time off/),
    wantsPayroll: has(/payroll|salary|payslip|wages/),
    
    // --- Admin ---
    wantsSettings: has(/setting|company|config|brand|logo/),
    wantsRoles: has(/role|permission|admin|access/),
    wantsPapers: has(/paper|document|file|upload/),
    wantsLogs: has(/log|daily|cash|balance/),

    // --- Filters ---
    date: p.match(/\d{4}-\d{2}-\d{2}/)?.[0] || p.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)?.[0] || null,
    search: p.match(/"([^"]+)"/)?.[1] || null, // captures text inside "quotes"
  };
}

/* ---------------- 3. SERVER LOGIC ---------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    /* --- Auth --- */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated User");

    const { prompt } = await req.json();
    const q = parsePrompt(prompt);
    const context: string[] = [];

    // Helper for date filtering
    const applyDate = (query: any, col: string) => {
      if (q.date) {
        // Simple conversion if needed, assuming YYYY-MM-DD input
        query = query.eq(col, q.date); 
      }
      return query;
    };

    /* =================================================================================
       GROUP 1: CRM (Leads, Customers, Interactions)
       Tables: leads, customers, activities, calls, tasks
    ================================================================================= */
    
    if (q.wantsLeads) {
      let query = supabase.from("leads").select("*").eq("user_id", user.id).limit(15);
      if(q.search) query = query.ilike('name', `%${q.search}%`);
      const { data } = await applyDate(query, 'created_at');
      context.push(`Leads: ${JSON.stringify(data)}`);
    }

    if (q.wantsCustomers) {
      let query = supabase.from("customers").select("*").eq("user_id", user.id).limit(15);
      if(q.search) query = query.ilike('name', `%${q.search}%`);
      const { data } = await query;
      context.push(`Customers: ${JSON.stringify(data)}`);
    }

    if (q.wantsActivities) {
      const { data } = await supabase.from("activities")
        .select("activity_type, subject, description, created_at")
        .eq("user_id", user.id).limit(10);
      context.push(`Activities: ${JSON.stringify(data)}`);
    }

    if (q.wantsCalls) {
      const { data } = await supabase.from("calls")
        .select("*") // Fetch all to see duration, outcome, etc.
        .eq("user_id", user.id).limit(10);
      context.push(`Calls: ${JSON.stringify(data)}`);
    }

    if (q.wantsTasks) {
      const { data } = await supabase.from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "completed"); // Focus on pending usually
      context.push(`Tasks (Pending/In Progress): ${JSON.stringify(data)}`);
    }

    /* =================================================================================
       GROUP 2: SALES (Deals, Quotes, Sales Orders)
       Tables: deals, deal_items, quotations, quotation_items, sales_orders, sales_order_items
    ================================================================================= */

    if (q.wantsDeals) {
      const { data } = await supabase.from("deals")
        .select(`
          title, stage, value, probability, expected_close_date,
          deal_items ( description, quantity, unit_price )
        `)
        .eq("user_id", user.id).limit(10);
      context.push(`Deals: ${JSON.stringify(data)}`);
    }

    if (q.wantsQuotations) {
      const { data } = await supabase.from("quotations")
        .select(`
          quotation_number, total_amount, status, valid_until,
          quotation_items ( description, quantity, amount )
        `)
        .eq("user_id", user.id).limit(10);
      context.push(`Quotations: ${JSON.stringify(data)}`);
    }

    if (q.wantsSalesOrders || q.wantsRevenue) {
      let query = supabase.from("sales_orders")
        .select(`
          order_number, total_amount, status, payment_status, order_date,
          sales_order_items ( description, quantity, amount )
        `)
        .eq("user_id", user.id);
      
      const { data } = await applyDate(query, 'order_date');
      
      // Calculate revenue if requested
      const totalRevenue = data?.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      context.push(`Sales Orders: ${JSON.stringify(data)}`);
      if(q.wantsRevenue) context.push(`Calculated Total Revenue from these orders: ${totalRevenue}`);
    }

    /* =================================================================================
       GROUP 3: PROCUREMENT (POs, Vendors)
       Tables: purchase_orders, purchase_order_items, vendors
    ================================================================================= */

    if (q.wantsPurchaseOrders) {
      const { data } = await supabase.from("purchase_orders")
        .select(`
          po_number, status, total_amount, vendor_id,
          purchase_order_items ( description, quantity, amount )
        `)
        .eq("user_id", user.id).limit(10);
      context.push(`Purchase Orders: ${JSON.stringify(data)}`);
    }

    if (q.wantsVendors) {
      const { data } = await supabase.from("vendors")
        .select("name, company, email, city")
        .eq("user_id", user.id);
      context.push(`Vendors: ${JSON.stringify(data)}`);
    }

    /* =================================================================================
       GROUP 4: INVENTORY (Products, Warehouses, Approvals)
       Tables: products, warehouses, stock_approval, price_books, price_book_items, product_catalogues/categories
    ================================================================================= */

    if (q.wantsProducts) {
      let query = supabase.from("products")
        .select("name, sku, quantity_in_stock, reorder_level, unit_price, cost_price")
        .eq("user_id", user.id).limit(20);
      if(q.search) query = query.ilike('name', `%${q.search}%`);
      const { data } = await query;
      context.push(`Products: ${JSON.stringify(data)}`);
    }

    if (q.wantsWarehouses) {
      const { data } = await supabase.from("warehouses").select("*").eq("user_id", user.id);
      context.push(`Warehouses: ${JSON.stringify(data)}`);
    }

    if (q.wantsStockApproval) {
      // JOIN products to get the Name, not just ID
      const { data } = await supabase.from("stock_approval")
        .select(`
          quantity, approval_type, status, notes,
          products ( name, sku )
        `)
        .eq("user_id", user.id)
        .eq("status", "pending");
      context.push(`Pending Stock Approvals: ${JSON.stringify(data)}`);
    }

    if (q.wantsPriceBooks) {
      const { data } = await supabase.from("price_books")
        .select(`name, is_active, price_book_items ( list_price, product_id )`)
        .eq("user_id", user.id);
      context.push(`Price Books: ${JSON.stringify(data)}`);
    }

    if (q.wantsCatalogues) {
      const { data: cats } = await supabase.from("product_catalogues").select("*").eq("user_id", user.id);
      const { data: subcats } = await supabase.from("product_categories").select("*").eq("user_id", user.id);
      context.push(`Catalogues: ${JSON.stringify(cats)}, Categories: ${JSON.stringify(subcats)}`);
    }

    /* =================================================================================
       GROUP 5: HR (Employees, Depts, Attendance, Payroll)
       Tables: employees, departments, department_members, attendance, leave_requests, payroll
    ================================================================================= */

    if (q.wantsEmployees) {
      // JOIN departments to see Department Name
      const { data } = await supabase.from("employees")
        .select(`
           first_name, last_name, position, status, email, phone, salary,
           departments ( name )
        `)
        .eq("user_id", user.id);
      context.push(`Employees: ${JSON.stringify(data)}`);
    }

    if (q.wantsDepartments) {
      const { data } = await supabase.from("departments")
        .select(`
           name, head_of_department, 
           department_members ( role, employee_id )
        `)
        .eq("user_id", user.id);
      context.push(`Departments: ${JSON.stringify(data)}`);
    }

    if (q.wantsAttendance) {
      let query = supabase.from("attendance")
        .select(`
          date, status, check_in, check_out, notes,
          employees ( first_name, last_name )
        `)
        .eq("user_id", user.id);
      const { data } = await applyDate(query, 'date');
      context.push(`Attendance: ${JSON.stringify(data)}`);
    }

    if (q.wantsLeaves) {
      const { data } = await supabase.from("leave_requests")
        .select(`
          leave_type, start_date, days, status, reason,
          employees ( first_name, last_name )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(10);
      context.push(`Leave Requests: ${JSON.stringify(data)}`);
    }

    if (q.wantsPayroll) {
      const { data } = await supabase.from("payroll")
        .select(`
          month, year, basic_salary, net_salary, status, payment_date,
          employees ( first_name, last_name )
        `)
        .eq("user_id", user.id)
        .limit(10);
      
      if (q.wantsPayroll && parsePrompt(prompt).wantsSettings) {
         const { data: settings } = await supabase.from("payroll_month_settings").select("*").eq("user_id", user.id);
         context.push(`Payroll Settings: ${JSON.stringify(settings)}`);
      }
      
      context.push(`Payroll Data: ${JSON.stringify(data)}`);
    }

    /* =================================================================================
       GROUP 6: ADMIN (Settings, Roles, Papers, Daily Logs)
       Tables: company_settings, user_roles, papers, daily_logs
    ================================================================================= */

    if (q.wantsSettings) {
      const { data } = await supabase.from("company_settings").select("*").eq("user_id", user.id).single();
      context.push(`Company Settings: ${JSON.stringify(data)}`);
    }

    if (q.wantsRoles) {
      const { data } = await supabase.from("user_roles").select("*").eq("user_id", user.id);
      context.push(`User Roles: ${JSON.stringify(data)}`);
    }

    if (q.wantsPapers) {
      const { data } = await supabase.from("papers").select("name, file_type, created_at").eq("user_id", user.id).limit(10);
      context.push(`Papers: ${JSON.stringify(data)}`);
    }

    if (q.wantsLogs || q.wantsRevenue) { 
      const { data } = await supabase.from("daily_logs")
        .select("log_date, income_amount, expense_amount, bank_balance, cash_in_hand")
        .eq("user_id", user.id)
        .order("log_date", { ascending: false }).limit(7);
      context.push(`Daily Logs (Financials): ${JSON.stringify(data)}`);
    }

    /* ---------------- 4. FAILSAFE & AI GENERATION ---------------- */

    if (context.length === 0) {
      // If no keywords matched, fetch a high-level summary of everything
      // so the AI isn't completely blind.
      const { count: leadCount } = await supabase.from("leads").select("*", { count: 'exact', head: true }).eq("user_id", user.id);
      const { count: orderCount } = await supabase.from("sales_orders").select("*", { count: 'exact', head: true }).eq("user_id", user.id);
      context.push(`No specific filters matched. System Overview: Total Leads: ${leadCount}, Total Sales Orders: ${orderCount}.`);
    }

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // Fast, capable model
        messages: [
          {
            role: "system",
            content: `You are an intelligent Database Assistant.
            
            CONTEXT DATA:
            ${context.join("\n\n")}
            
            INSTRUCTIONS:
            1. Answer the user's question based strictly on the JSON data provided above.
            2. If specific data (like a name or date) is in the JSON, mention it.
            3. If the JSON is empty or null, state "No relevant records found."
            4. Be professional and concise.`
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const aiData = await aiRes.json();
    const reply = aiData?.choices?.[0]?.message?.content ?? "No response generated.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});