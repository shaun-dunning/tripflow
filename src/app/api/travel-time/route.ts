import { NextRequest, NextResponse } from "next/server";

// In-memory cache: lives for the duration of one serverless instance.
// Good enough to avoid hammering geocoding APIs during a single session.
const memCache = new Map<string, { durationMin: number; distanceKm: number; estimated: boolean }>();

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "TripFlow/1.0 (family-travel-app)" },
      next: { revalidate: 86400 },
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
  dLng: number
): Promise<{ durationMin: number; distanceKm: number } | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${oLng},${oLat};${dLng},${dLat}?overview=false`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
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
  lng2: number
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const destination = searchParams.get("destination");
  if (!destination) {
    return NextResponse.json({ error: "destination required" }, { status: 400 });
  }

  const oLat = parseFloat(searchParams.get("originLat") ?? "NaN");
  const oLng = parseFloat(searchParams.get("originLng") ?? "NaN");
  if (isNaN(oLat) || isNaN(oLng)) {
    return NextResponse.json(
      { error: "originLat and originLng required" },
      { status: 400 }
    );
  }

  const cacheKey = `${oLat.toFixed(4)},${oLng.toFixed(4)}|${destination}`;
  const cached = memCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // ── 1. Google Distance Matrix (requires GOOGLE_MAPS_API_KEY) ──────────────
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const gmUrl =
        `https://maps.googleapis.com/maps/api/distancematrix/json` +
        `?origins=${oLat},${oLng}` +
        `&destinations=${encodeURIComponent(destination)}` +
        `&mode=driving&key=${googleKey}`;
      const gmRes = await fetch(gmUrl, { next: { revalidate: 3600 } });
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
          const result = {
            durationMin: Math.max(1, Math.round(el.duration.value / 60)),
            distanceKm: Math.round((el.distance.value / 1000) * 10) / 10,
            estimated: false,
          };
          memCache.set(cacheKey, result);
          return NextResponse.json(result);
        }
      }
    } catch {
      // fall through to free fallback
    }
  }

  // ── 2. Nominatim geocode destination + OSRM route ────────────────────────
  const destCoords = await geocodeAddress(destination);
  if (destCoords) {
    const osrmResult = await osrmRoute(oLat, oLng, destCoords.lat, destCoords.lng);
    if (osrmResult) {
      const result = { ...osrmResult, estimated: false };
      memCache.set(cacheKey, result);
      return NextResponse.json(result);
    }

    // Haversine straight-line estimate (road factor 1.35, avg 40 km/h)
    const km = haversineKm(oLat, oLng, destCoords.lat, destCoords.lng);
    const roadKm = km * 1.35;
    const result = {
      durationMin: Math.max(1, Math.round((roadKm / 40) * 60)),
      distanceKm: Math.round(roadKm * 10) / 10,
      estimated: true,
    };
    memCache.set(cacheKey, result);
    return NextResponse.json(result);
  }

  // ── 3. No data available ──────────────────────────────────────────────────
  return NextResponse.json({ durationMin: null, distanceKm: null, estimated: true });
}
