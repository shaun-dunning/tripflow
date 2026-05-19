import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function sendPush(deviceToken: string, title: string, body: string, deepLink?: string) {
  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ deviceToken, title, body, deepLink }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const todayUTC = new Date();
  const todayStr = todayUTC.toISOString().split("T")[0];
  const tomorrowStr = new Date(todayUTC.getTime() + 86400000).toISOString().split("T")[0];

  let sent = 0;

  // ── 1. Day-before trip reminder ───────────────────────────────────────────
  const { data: tomorrowTrips } = await supabase
    .from("trips")
    .select("id, title, destination")
    .eq("start_date", tomorrowStr);

  for (const trip of tomorrowTrips ?? []) {
    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("trip_id", trip.id);

    const { data: packingRows } = await supabase
      .from("packing_items")
      .select("packed")
      .eq("trip_id", trip.id);

    const total = packingRows?.length ?? 0;
    const packed = packingRows?.filter((r) => r.packed).length ?? 0;
    const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

    const body = total > 0
      ? `You're ${pct}% packed — ${total - packed} items left before departure.`
      : "Get ready — your adventure starts tomorrow!";

    for (const { token } of tokens ?? []) {
      await sendPush(token, `✈️ ${trip.destination} starts tomorrow!`, body, "/");
      sent++;
    }
  }

  // ── 2. Day-of reservation reminders ──────────────────────────────────────
  const { data: todayItems } = await supabase
    .from("agenda_items")
    .select("id, title, emoji, time, trip_days!inner(trip_id)")
    .eq("trip_days.date", todayStr)
    .eq("reservation", true);

  for (const item of todayItems ?? []) {
    const tripId = (item.trip_days as { trip_id: string }).trip_id;

    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("trip_id", tripId);

    for (const { token } of tokens ?? []) {
      await sendPush(
        token,
        `${item.emoji} ${item.title}`,
        `Your reservation is today at ${item.time}.`,
        "/"
      );
      sent++;
    }
  }

  // ── 3. Early wake-up alerts (items before 7am → notify night before) ──────
  // Find agenda items before 7:00 AM scheduled for tomorrow
  const { data: earlyItems } = await supabase
    .from("agenda_items")
    .select("id, title, emoji, time, trip_days!inner(trip_id)")
    .eq("trip_days.date", tomorrowStr);

  const earlyFiltered = (earlyItems ?? []).filter((item) => {
    const match = item.time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return false;
    let h = parseInt(match[1]);
    const pm = match[3].toUpperCase() === "PM";
    if (pm && h !== 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h < 7;
  });

  for (const item of earlyFiltered) {
    const tripId = (item.trip_days as { trip_id: string }).trip_id;

    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("trip_id", tripId);

    for (const { token } of tokens ?? []) {
      await sendPush(
        token,
        `⏰ Early start tomorrow: ${item.emoji} ${item.title}`,
        `Set your alarm — this one's at ${item.time}.`,
        "/"
      );
      sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
