// Voice / transcript → ফর্দ lines using Lovable AI Gateway (Gemini).
// Input: { transcript?: string, audio_base64?: string, mime_type?: string }
// Output: { lines: string[] }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `তুমি একজন বাংলাদেশী দোকানদারের সহকারী। ব্যবহারকারী মুখে বাজারের ফর্দ বলে — যেমন "এক কেজি পোলাওর চাল দুই কেজি খাসির মাংস তিনটা ডিম এক হালি কলা"। তোমার কাজ হলো এই কথাটিকে আলাদা আলাদা পণ্যের লাইনে ভেঙে দেওয়া।

নিয়ম:
- প্রতিটি পণ্য একটি লাইনে (পরিমাণ + একক + পণ্যের নাম)
- বাংলায় লিখবে, সাধারণ মানুষের ভাষায়
- সংখ্যা বাংলা অংকে ("১", "২", "৩"...) বা যা ব্যবহারকারী বলেছে সেভাবে
- কোনো দাম, ক্রমিক নম্বর, bullet, বা অতিরিক্ত শব্দ যোগ করবে না
- শুধু JSON array দাও — অন্য কিছু না

উদাহরণ input: "এক কেজি চাল আর দুই কেজি ডাল এবং এক ডজন ডিম"
output: ["১ কেজি চাল", "২ কেজি ডাল", "১ ডজন ডিম"]`;

type ChatMessage = {
  role: "system" | "user";
  content: string | Array<{ type: "text"; text: string } | { type: "input_audio"; input_audio: { data: string; format: string } }>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      transcript?: string;
      audio_base64?: string;
      mime_type?: string;
    };

    let transcript = (body.transcript ?? "").trim();

    // If only audio is given, transcribe with Gemini first.
    if (!transcript && body.audio_base64) {
      const mt = body.mime_type ?? "audio/webm";
      // Gemini wants a short format hint (e.g. "webm", "mp4", "wav", "ogg")
      const fmt = mt.split("/")[1]?.split(";")[0] ?? "webm";
      const transcribeMessages: ChatMessage[] = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "এই অডিওটি বাংলায় লেখো। শুধু transcript দাও, অন্য কিছু না।",
            },
            {
              type: "input_audio",
              input_audio: { data: body.audio_base64, format: fmt },
            },
          ],
        },
      ];

      const tr = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: transcribeMessages,
        }),
      });

      if (!tr.ok) {
        const txt = await tr.text();
        return new Response(JSON.stringify({ error: `Transcribe failed: ${tr.status} ${txt}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const trData = (await tr.json()) as { choices?: Array<{ message?: { content?: string } }> };
      transcript = (trData.choices?.[0]?.message?.content ?? "").trim();
    }

    if (!transcript) {
      return new Response(JSON.stringify({ error: "No transcript or audio provided", lines: [] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Now ask Gemini to split transcript → lines (use tool calling for clean JSON)
    const splitRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_fordo_lines",
              description: "ফর্দের লাইনগুলো সংরক্ষণ করো",
              parameters: {
                type: "object",
                properties: {
                  lines: {
                    type: "array",
                    items: { type: "string" },
                    description: "প্রতিটি লাইনে একটি পণ্য (পরিমাণ + একক + নাম)",
                  },
                },
                required: ["lines"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_fordo_lines" } },
      }),
    });

    if (!splitRes.ok) {
      const txt = await splitRes.text();
      const status = splitRes.status === 429 ? 429 : splitRes.status === 402 ? 402 : 502;
      return new Response(
        JSON.stringify({
          error:
            status === 429
              ? "অনেক বেশি অনুরোধ — একটু পরে আবার চেষ্টা করুন"
              : status === 402
                ? "AI credit শেষ — workspace settings → usage এ যোগ করুন"
                : `Gemini error: ${txt}`,
          lines: [],
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const splitData = (await splitRes.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{ function?: { arguments?: string } }>;
          content?: string;
        };
      }>;
    };
    const tc = splitData.choices?.[0]?.message?.tool_calls?.[0];
    let lines: string[] = [];
    if (tc?.function?.arguments) {
      try {
        const args = JSON.parse(tc.function.arguments) as { lines?: string[] };
        lines = (args.lines ?? []).map((s) => s.trim()).filter(Boolean);
      } catch {
        /* fall through */
      }
    }
    // Fallback: try parse content as JSON array
    if (lines.length === 0) {
      const c = splitData.choices?.[0]?.message?.content ?? "";
      const m = c.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          const arr = JSON.parse(m[0]) as unknown;
          if (Array.isArray(arr)) lines = arr.map(String).map((s) => s.trim()).filter(Boolean);
        } catch {
          /* ignore */
        }
      }
    }

    return new Response(JSON.stringify({ lines, transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, lines: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});