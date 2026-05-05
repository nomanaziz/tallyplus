// Public stats endpoint — anonymous, cached. Returns real counts for the landing page.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const [shopsRes, ownersRes, customersRes] = await Promise.all([
      supabase.from("shops").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("consumer_profiles").select("id", { count: "exact", head: true }),
    ]);

    let totalUsers = 0;
    try {
      // admin.listUsers returns at most perPage; we just want the total.
      const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      // @ts-expect-error - total exists at runtime
      totalUsers = (usersPage as { total?: number })?.total ?? 0;
    } catch (_) {
      totalUsers = (ownersRes.count ?? 0) + (customersRes.count ?? 0);
    }

    const body = {
      shops: shopsRes.count ?? 0,
      owners: ownersRes.count ?? 0,
      customers: customersRes.count ?? 0,
      totalUsers,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        ...cors,
        "content-type": "application/json",
        "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "stats_failed" }),
      { status: 500, headers: { ...cors, "content-type": "application/json" } },
    );
  }
});