import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();
  const priorMessages = (history as HistoryMessage[]).slice(0, -1);

  // ── Gemini (free tier) ────────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const contents = [
        ...priorMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: message }] },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { maxOutputTokens: 600 },
          }),
        }
      );

      const data = await res.json();

      // Handle API-level errors (bad key, quota, etc.)
      if (data.error) {
        console.error("Gemini API error:", data.error);
        throw new Error(data.error.message);
      }

      // Handle safety-blocked responses
      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error("No candidates returned from Gemini");
      }

      const reply = candidate.content?.parts?.[0]?.text
        ?? (candidate.finishReason === "SAFETY"
          ? "I can't answer that one — try asking about your Maui itinerary, activities, or local tips!"
          : "I'm not sure how to answer that. Try asking about your trip itinerary or things to do in Maui.");
      return NextResponse.json({ reply });
    } catch (err) {
      console.error("Gemini error:", err);
    }
  }

  // ── Anthropic fallback ────────────────────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: anthropicKey });

      const messages = [
        ...priorMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ];

      const response = await client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages,
      });

      const reply =
        response.content[0]?.type === "text"
          ? response.content[0].text
          : "Sorry, I couldn't generate a response.";
      return NextResponse.json({ reply });
    } catch (err) {
      console.error("Anthropic error:", err);
    }
  }

  // ── No key configured ─────────────────────────────────────────────────────
  return NextResponse.json({
    reply:
      "The AI assistant needs an API key to work. Add GEMINI_API_KEY (free at aistudio.google.com) to your Vercel environment variables.",
  });
}
