const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a friendly, knowledgeable trip assistant for a family vacation to Maui, Hawaii.

Trip details:
- Dates: June 5–11, 2026 (7 days)
- Hotel: Sheraton Maui Resort & Spa, Ka'anapali
- Travelers: Family — 2 adults + kids
- Flights: AA271 LAX→SEA, then AS845 SEA→OGG on Jun 5. Return Jun 11.

Planned activities:
- Day 1 (Jun 5, Fri): Travel day — arrive at Sheraton Ka'anapali
- Day 2 (Jun 6, Sat): Ka'anapali Beach, Snorkeling at Molokini Crater, Mama's Fish House dinner
- Day 3 (Jun 7, Sun): Road to Hana — Twin Falls, Hana Farms lunch, Waiʻanapanapa Black Sand Beach
- Day 4 (Jun 8, Mon): Beach day, Sheraton Spa massage, Humble Market dinner
- Day 5 (Jun 9, Tue): Upcountry Farmer's Market, Paia Town, Old Lahaina Luau
- Day 6 (Jun 10, Wed): Haleakalā Sunrise (2:30am departure!), Sliding Sands crater hike
- Day 7 (Jun 11, Thu): Last swim, check out, fly home

Local favorites near Ka'anapali:
- Kapalua Beach: calm bay, great for kids, snorkel gear rentals
- Monkeypod Kitchen: local farm-to-table, great cocktails, kids menu
- Maui Ocean Center: premier aquarium in Maalaea, great rainy day option
- Ululani's Shave Ice: best on the island (multiple locations)
- Andaz Maui Spa: world-class, ocean views
- Surfing Goat Dairy: fun family farm tour in Kula
- Down the Hatch: waterfront bar in Lahaina
- Wailea Beach Path: 1.5-mile free coastal walk

Tips:
- Ka'anapali is on the west side — sheltered, calm water, great for families
- Haleakalā summit is 10,000ft and gets cold — bring layers
- Road to Hana: 52 miles, 600+ turns, plan for a full day
- Reef-safe sunscreen is required at Hawaii state parks
- Maui time is HST (UTC-10), 3 hours behind LA in summer

Keep responses concise and friendly. When suggesting things to do, be specific to Maui and the family context. Answer questions about the planned itinerary accurately.`;

type HistoryMessage = { role: string; content: string };

type AgendaItemInput = {
  time: string;
  title: string;
  emoji: string;
  notes?: string;
  reservation?: boolean;
};

function buildAgendaContext(agendaItems: AgendaItemInput[], dayNum: number): string {
  if (!agendaItems || agendaItems.length === 0) return "";

  const toMins = (t: string): number => {
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return -1;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const pm = match[3].toUpperCase() === "PM";
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h * 60 + m;
  };

  const sorted = [...agendaItems].sort((a, b) => toMins(a.time) - toMins(b.time));

  const lines = sorted.map((it) => {
    const parts = [`${it.emoji} ${it.time}: ${it.title}`];
    if (it.notes) parts.push(`(${it.notes})`);
    if (it.reservation) parts.push("[Reserved]");
    return parts.join(" ");
  });

  const gaps: string[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const endMins = toMins(sorted[i].time);
    const startMins = toMins(sorted[i + 1].time);
    if (endMins >= 0 && startMins > endMins) {
      const gapMins = startMins - endMins;
      if (gapMins >= 90) {
        const hrs = Math.floor(gapMins / 60);
        const mins = gapMins % 60;
        const dur = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
        gaps.push(`  • ${dur} free gap between ${sorted[i].time} and ${sorted[i + 1].time}`);
      }
    }
  }

  let context = `\n\nCURRENT DAY ${dayNum} AGENDA:\n${lines.join("\n")}`;
  if (gaps.length > 0) {
    context += `\n\nFREE TIME GAPS:\n${gaps.join("\n")}`;
  } else {
    context += "\n\n(No significant free gaps detected — schedule is fairly full.)";
  }
  return context;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: {
    message: string;
    history: HistoryMessage[];
    agendaItems?: AgendaItemInput[];
    dayNum?: number;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { message, history, agendaItems, dayNum } = body;
  const priorMessages = (history ?? []).slice(0, -1);

  const agendaContext = agendaItems
    ? buildAgendaContext(agendaItems, dayNum ?? 1)
    : "";
  const effectiveSystemPrompt = agendaContext
    ? SYSTEM_PROMPT + agendaContext
    : SYSTEM_PROMPT;

  const json = (data: unknown) =>
    new Response(JSON.stringify(data), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  // ── Gemini ────────────────────────────────────────────────────────────────
  const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
  let geminiError = "";

  if (geminiKey && geminiKey !== "your_key_here") {
    try {
      const BASE = "https://generativelanguage.googleapis.com/v1beta";
      const listRes = await fetch(`${BASE}/models?key=${geminiKey}`);
      const listData = await listRes.json();

      if (listData.error) {
        geminiError = `ListModels error: ${listData.error.message}`;
        throw new Error(geminiError);
      }

      type GeminiModel = { name: string; supportedGenerationMethods?: string[] };
      const flashModels: string[] = ((listData.models as GeminiModel[]) ?? [])
        .filter(
          (m) =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            m.name.includes("flash")
        )
        .map((m) => m.name.replace("models/", ""));

      const preferred = [
        ...flashModels.filter((n) => n.startsWith("gemini-1.5-flash")),
        ...flashModels.filter((n) => n.startsWith("gemini-2.0-flash")),
        ...flashModels,
      ];

      if (preferred.length === 0) {
        geminiError = `No flash model found. Available: ${flashModels.join(", ") || "none"}`;
        throw new Error(geminiError);
      }

      const contents = [
        ...priorMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: message }] },
      ];

      for (const model of preferred) {
        const res = await fetch(
          `${BASE}/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: effectiveSystemPrompt }] },
              contents,
              generationConfig: { maxOutputTokens: 1200 },
            }),
          }
        );

        const data = await res.json();

        if (data.error) {
          geminiError = `[${model}] ${data.error.message}`;
          continue;
        }

        const candidate = data.candidates?.[0];
        if (!candidate) {
          geminiError = `[${model}] No candidates in response`;
          continue;
        }

        let reply =
          candidate.content?.parts
            ?.map((part: { text?: string }) => part.text ?? "")
            .join("")
            .trim() ??
          (candidate.finishReason === "SAFETY"
            ? "I can't answer that one — try asking about your Maui itinerary, activities, or local tips!"
            : "I'm not sure how to answer that. Try asking about your trip itinerary or things to do in Maui.");

        if (candidate.finishReason === "MAX_TOKENS") {
          reply = `${reply.replace(/\s+$/, "")}\n\nI was cut off there. Ask me to continue and I'll pick up from this point.`;
        }

        return json({ reply });
      }
    } catch (err) {
      if (!geminiError) geminiError = err instanceof Error ? err.message : String(err);
    }
  } else {
    geminiError = "GEMINI_API_KEY not set or is placeholder";
  }

  // ── Anthropic fallback ────────────────────────────────────────────────────
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (anthropicKey && anthropicKey !== "your_key_here") {
    try {
      const messages = [
        ...priorMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1200,
          system: effectiveSystemPrompt,
          messages,
        }),
      });

      const data = await res.json();
      const reply =
        data.content?.[0]?.type === "text"
          ? data.content[0].text
          : "Sorry, I couldn't generate a response.";

      return json({ reply });
    } catch (err) {
      console.error("Anthropic error:", err);
    }
  }

  return json({
    reply: `⚠️ AI error — ${geminiError || "unknown error"}. Check function logs for details.`,
  });
});
