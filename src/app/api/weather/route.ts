import { NextResponse } from "next/server";

// Sheraton Maui Resort & Spa, Ka'anapali coordinates
const LAT = 20.9282;
const LON = -156.6942;

export type ForecastDay = {
  date: string;        // "YYYY-MM-DD"
  high: number;
  low: number;
  emoji: string;
  condition: string;
  precipChance: number; // 0–100
  uvIndex: number;
  note?: string;        // optional context (e.g. "Summit ~55°F")
};

// Realistic per-day Ka'anapali forecast for the Maui trip (Jun 5–11, 2026).
// Road to Hana (east Maui) gets 2× the rainfall of Ka'anapali — reflected on Jun 7.
// Haleakalā summit sits at ~10k ft — low is summit temp, note calls it out.
const TRIP_FORECAST: ForecastDay[] = [
  { date: "2026-06-05", high: 83, low: 72, emoji: "⛅", condition: "Partly Cloudy",    precipChance: 15, uvIndex: 8 },
  { date: "2026-06-06", high: 86, low: 74, emoji: "☀️", condition: "Sunny",            precipChance:  5, uvIndex: 10 },
  { date: "2026-06-07", high: 78, low: 70, emoji: "🌦️", condition: "Showers Likely",   precipChance: 70, uvIndex:  6 },
  { date: "2026-06-08", high: 87, low: 75, emoji: "☀️", condition: "Sunny",            precipChance:  5, uvIndex: 11 },
  { date: "2026-06-09", high: 85, low: 73, emoji: "⛅", condition: "Mostly Sunny",     precipChance: 10, uvIndex:  9 },
  { date: "2026-06-10", high: 84, low: 55, emoji: "🌤️", condition: "Clear at Summit",  precipChance: 10, uvIndex:  7, note: "Summit ~55°F — bring layers" },
  { date: "2026-06-11", high: 82, low: 73, emoji: "☀️", condition: "Sunny",            precipChance:  5, uvIndex:  9 },
];

function conditionToEmoji(code: number): string {
  if (code >= 200 && code < 300) return "⛈️";
  if (code >= 300 && code < 400) return "🌦️";
  if (code >= 500 && code < 600) return "🌧️";
  if (code >= 600 && code < 700) return "❄️";
  if (code >= 700 && code < 800) return "🌫️";
  if (code === 800) return "☀️";
  if (code === 801 || code === 802) return "⛅";
  if (code >= 803) return "☁️";
  return "🌤️";
}

const STATIC_CURRENT = {
  temp: 82, condition: "Partly Cloudy", emoji: "⛅",
  humidity: 65, feelsLike: 85, high: 86, low: 74,
  source: "static" as const,
};

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ...STATIC_CURRENT, forecast: TRIP_FORECAST });
  }

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${apiKey}&units=imperial`,
        { next: { revalidate: 1800 } }
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${apiKey}&units=imperial&cnt=40`,
        { next: { revalidate: 1800 } }
      ),
    ]);

    if (!currentRes.ok) throw new Error(`OpenWeather returned ${currentRes.status}`);
    const data = await currentRes.json();
    const weatherCode: number = data.weather?.[0]?.id ?? 800;
    const emoji = conditionToEmoji(weatherCode);

    // Merge live 5-day forecast over our typical data where dates overlap
    let mergedForecast = [...TRIP_FORECAST];
    if (forecastRes.ok) {
      const fData = await forecastRes.json();
      const byDate: Record<string, { highTemps: number[]; lowTemps: number[]; codes: number[]; pops: number[] }> = {};
      for (const entry of fData.list ?? []) {
        const date = entry.dt_txt.slice(0, 10);
        if (!byDate[date]) byDate[date] = { highTemps: [], lowTemps: [], codes: [], pops: [] };
        byDate[date].highTemps.push(entry.main.temp_max);
        byDate[date].lowTemps.push(entry.main.temp_min);
        byDate[date].codes.push(entry.weather[0].id);
        byDate[date].pops.push(Math.round((entry.pop ?? 0) * 100));
      }
      mergedForecast = TRIP_FORECAST.map((day) => {
        const live = byDate[day.date];
        if (!live) return day;
        const high = Math.round(Math.max(...live.highTemps));
        const low  = Math.round(Math.min(...live.lowTemps));
        const dominantCode = live.codes.sort((a, b) =>
          live.codes.filter(c => c === b).length - live.codes.filter(c => c === a).length
        )[0];
        const precipChance = Math.max(...live.pops);
        return {
          ...day,
          high, low,
          emoji: conditionToEmoji(dominantCode),
          condition: data.weather?.[0]?.description ?? day.condition,
          precipChance,
        };
      });
    }

    return NextResponse.json({
      temp: Math.round(data.main.temp),
      condition: data.weather?.[0]?.main ?? "Clear",
      emoji,
      humidity: data.main.humidity,
      feelsLike: Math.round(data.main.feels_like),
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      source: "live" as const,
      forecast: mergedForecast,
    });
  } catch {
    return NextResponse.json({ ...STATIC_CURRENT, forecast: TRIP_FORECAST });
  }
}
