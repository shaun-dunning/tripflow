const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TripContext = {
  title?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  travelers?: string[];
  dayLabels?: string[];
};

type HistoryMessage = { role: string; content: string };

type AgendaItemInput = {
  time: string;
  title: string;
  emoji: string;
  notes?: string;
  reservation?: boolean;
};

function buildSystemPrompt(tripContext?: TripContext): string {
  if (!tripContext?.destination) {
    return `You are a friendly, knowledgeable trip assistant. Help the user with their travel plans — activities, restaurants, logistics, packing, and day-of decisions. Keep responses concise and friendly.`;
  }

  const { title, destination, startDate, endDate, travelers, dayLabels } = tripContext;

  let prompt = `You are a friendly, knowledgeable trip assistant for ${title ?? destination}.

Trip details:
- Destination: ${destination}`;

  if (startDate && endDate) {
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
    const startLabel = start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const endLabel = end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    prompt += `\n- Dates: ${startLabel} – ${endLabel} (${nights} nights)`;
  }

  if (travelers && travelers.length > 0) {
    prompt += `\n- Travelers: ${travelers.join(", ")}`;
  }

  if (dayLabels && dayLabels.length > 0) {
    prompt += `\n\nPlanned days:\n${dayLabels.map((label, i) => `- Day ${i + 1}: ${label}`).join("\n")}`;
  }

  prompt += `\n\nKeep responses concise and friendly. Focus on ${destination} — activities, restaurants, logistics, and day-of decisions. When you don't know specific local details, give useful general travel advice for the destination. Answer questions about the planned itinerary accurately.`;

  return prompt;
}

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
    tripContext?: TripContext;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { message, history, agendaItems, dayNum, tripContext } = body;
  const priorMessages = (history ?? []).slice(0, -1);

  const agendaContext = agendaItems
    ? buildAgendaContext(agendaItems, dayNum ?? 1)
    : "";
  const systemPrompt = buildSystemPrompt(tripContext);
  const effectiveSystemPrompt = agendaContext
    ? systemPrompt + agendaContext
    : systemPrompt;

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
        ...flashModels.filter((n) => n.startsWith("gemini-2.0-flash")),
        ...flashModels.filter((n) => n.startsWith("gemini-1.5-flash")),
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
            ? "I can't answer that one — try asking about your itinerary, activities, or local tips!"
            : "I'm not sure how to answer that. Try asking about your trip itinerary or things to do.");

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
