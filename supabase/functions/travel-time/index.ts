const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Daywave/1.0 (family-travel-app)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function osrmRoute(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
): Promise<{ durationMin: number; distanceKm: number } | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${oLng},${oLat};${dLng},${dLat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: Array<{ duration: number; distance: number }>;
    };
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    };
  } catch {
    return null;
  }
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(req.url);
  const destination = url.searchParams.get("destination");
  if (!destination) {
    return json({ error: "destination required" }, 400);
  }

  const oLat = parseFloat(url.searchParams.get("originLat") ?? "NaN");
  const oLng = parseFloat(url.searchParams.get("originLng") ?? "NaN");
  if (isNaN(oLat) || isNaN(oLng)) {
    return json({ error: "originLat and originLng required" }, 400);
  }

  // ── 1. Google Distance Matrix (requires GOOGLE_MAPS_API_KEY secret) ─────
  const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (googleKey) {
    try {
      const gmUrl =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${oLat},${oLng}` +
        `&destinations=${encodeURIComponent(destination)}` +
        `&mode=driving&key=${googleKey}`;
      const gmRes = await fetch(gmUrl);
      if (gmRes.ok) {
        const gmData = (await gmRes.json()) as {
          rows?: Array<{
            elements?: Array<{
              status: string;
              duration?: { value: number };
              distance?: { value: number };
            }>;
          }>;
        };
        const el = gmData.rows?.[0]?.elements?.[0];
        if (el?.status === "OK" && el.duration && el.distance) {
          return json({
            durationMin: Math.max(1, Math.round(el.duration.value / 60)),
            distanceKm: Math.round((el.distance.value / 1000) * 10) / 10,
            estimated: false,
          });
        }
      }
    } catch {
      // fall through
    }
  }

  // ── 2. Nominatim geocode + OSRM route ────────────────────────────────────
  const destCoords = await geocodeAddress(destination);
  if (destCoords) {
    const osrmResult = await osrmRoute(
      oLat,
      oLng,
      destCoords.lat,
      destCoords.lng,
    );
    if (osrmResult) {
      return json({ ...osrmResult, estimated: false });
    }

    const km = haversineKm(oLat, oLng, destCoords.lat, destCoords.lng);
    const roadKm = km * 1.35;
    return json({
      durationMin: Math.max(1, Math.round((roadKm / 40) * 60)),
      distanceKm: Math.round(roadKm * 10) / 10,
      estimated: true,
    });
  }

  return json({ durationMin: null, distanceKm: null, estimated: true });
});
