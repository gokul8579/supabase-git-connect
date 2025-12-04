import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.6/+esm";

serve(async (req: Request) => {

  // --- CORS PRE-FLIGHT SUPPORT ---
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  // --- ONLY ALLOW POST ---
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const payload = await req.json();

    // ENV
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Validate input
    const signed_token = payload.signed_token;
    const data = payload.data;
    const form_name = payload.form_name || "Website Form";

    if (!signed_token || !data) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Decode token
    const base64Payload = signed_token.split(".")[1];
    const decoded = JSON.parse(atob(base64Payload));
    const user_id = decoded.user_id;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Insert raw form
    await sb.from("website_forms_raw").insert({
      user_id,
      form_name,
      data,
    });

    // Insert lead
    const name = data.name || "Unknown";
    const email = data.email || null;
    const phone = data.phone || null;

    await sb.from("leads").insert({
      user_id,
      name,
      email,
      phone,
      source: "website",
      status: "new",
      notes: JSON.stringify(data),
    });

    // Success
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("Server error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
