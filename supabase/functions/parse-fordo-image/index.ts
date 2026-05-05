// Parse a handwritten/printed shopping list (ফর্দ) image into structured items
// using the Lovable AI Gateway (Gemini vision). The image is NEVER persisted.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `আপনি একজন বাংলা OCR বিশেষজ্ঞ। ছবিতে একটি বাজারের ফর্দ (হাতে লেখা বা printed) আছে।
প্রতিটি লাইনের জন্য বের করুন:
- name: পণ্যের নাম (বাংলায়, যেভাবে লেখা)
- qty: পরিমাণ (সংখ্যা, যেমন "1", "2.5", "0.5")। না থাকলে খালি রাখুন।
- unit: একক — কেজি, গ্রাম, লিটার, মিলি, পিস, প্যাকেট, বোতল, বস্তা, ডজন, হালি, আঁটি ইত্যাদি। না থাকলে খালি।

শুধুমাত্র extract_fordo_items tool call দিয়ে JSON return করুন। কোনো অতিরিক্ত লেখা নয়।`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI gateway not configured" }, 500);

    const body = await req.json();
    const imageDataUrl = String(body?.image ?? "").trim();
    if (!imageDataUrl.startsWith("data:image/"))
      return json({ error: "Invalid image" }, 400);

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "এই ফর্দ থেকে পণ্যের তালিকা বের করুন।",
                },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_fordo_items",
                description:
                  "Return the parsed shopping list items from the image.",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          qty: { type: "string" },
                          unit: { type: "string" },
                        },
                        required: ["name"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["items"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_fordo_items" },
          },
        }),
      },
    );

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429)
        return json(
          { error: "AI ব্যস্ত — একটু পরে আবার চেষ্টা করুন" },
          429,
        );
      if (aiResp.status === 402)
        return json(
          { error: "AI credit শেষ — workspace settings থেকে যোগ করুন" },
          402,
        );
      return json({ error: "AI বিশ্লেষণে সমস্যা" }, 500);
    }

    const data = await aiResp.json();
    const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = tc?.function?.arguments;
    if (!argsStr) return json({ items: [] });

    let parsed: { items?: Array<{ name?: string; qty?: string; unit?: string }> } = {};
    try {
      parsed = JSON.parse(argsStr);
    } catch {
      return json({ items: [] });
    }
    const items = (parsed.items ?? [])
      .map((it) => ({
        name: String(it.name ?? "").trim(),
        qty: it.qty != null ? String(it.qty).trim() : "",
        unit: it.unit != null ? String(it.unit).trim() : "",
      }))
      .filter((it) => it.name.length > 0)
      .slice(0, 100);

    // NOTE: image is intentionally NOT persisted anywhere.
    return json({ items });
  } catch (e) {
    console.error("parse-fordo-image error", e);
    return json({ error: (e as Error).message }, 500);
  }
});