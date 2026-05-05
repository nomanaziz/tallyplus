import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

interface Payload {
  event_type: string;
  title: string;
  body: string;
  link?: string | null;
  chat_id?: string;
}

async function sendTelegram(chatId: string, text: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    throw new Error("Missing LOVABLE_API_KEY or TELEGRAM_API_KEY");
  }
  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Telegram error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMessage(p: Payload) {
  const lines = [`<b>${escapeHtml(p.title)}</b>`];
  if (p.body) lines.push(escapeHtml(p.body));
  if (p.link) lines.push(`\n🔗 ${escapeHtml(p.link)}`);
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.title) {
      return new Response(JSON.stringify({ error: "title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = formatMessage(payload);
    const results: Array<{ chat_id: string; ok: boolean; error?: string }> = [];

    // If a specific chat_id is passed (test message), send only there
    if (payload.chat_id) {
      try {
        await sendTelegram(payload.chat_id, text);
        results.push({ chat_id: payload.chat_id, ok: true });
      } catch (e) {
        results.push({ chat_id: payload.chat_id, ok: false, error: String(e) });
      }
    } else {
      // Fan-out to all active subscribers matching event_type
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: subs, error } = await supabase
        .from("admin_telegram_subscribers")
        .select("chat_id, events, is_active")
        .eq("is_active", true);
      if (error) throw error;

      const evt = payload.event_type || "all";
      const matched = (subs ?? []).filter(
        (s: { events: string[] }) =>
          (s.events ?? []).includes("all") || (s.events ?? []).includes(evt),
      );

      for (const s of matched) {
        try {
          await sendTelegram(s.chat_id as string, text);
          results.push({ chat_id: s.chat_id as string, ok: true });
        } catch (e) {
          results.push({ chat_id: s.chat_id as string, ok: false, error: String(e) });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-notify error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});