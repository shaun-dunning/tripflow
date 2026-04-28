import { NextResponse } from "next/server";

// Sheraton Maui Resort & Spa, Ka'anapali coordinates
const LAT = 20.9282;
const LON = -156.6942;

function conditionToEmoji(code: number): string {
  if (code >= 200 && code < 300) return "⛈️";  // thunderstorm
  if (code >= 300 && code < 400) return "🌦️";  // drizzle
  if (code >= 500 && code < 600) return "🌧️";  // rain
  if (code >= 600 && code < 700) return "❄️";   // snow
  if (code >= 700 && code < 800) return "🌫️";  // atmosphere
  if (code === 800) return "☀️";                // clear
  if (code === 801 || code === 802) return "⛅"; // few/scattered clouds
  if (code >= 803) return "☁️";                 // broken/overcast
  return "🌤️";
}

export async function GET() {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    // Return static Maui weather as fallback — realistic for June
    return NextResponse.json({
      temp: 82,
      condition: "Partly Cloudy",
      emoji: "⛅",
      humidity: 65,
      feelsLike: 85,
      high: 86,
      low: 74,
      source: "static",
    });
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${apiKey}&units=imperial`,
      { next: { revalidate: 1800 } } // cache 30 min
    );

    if (!res.ok) throw new Error(`OpenWeather returned ${res.status}`);

    const data = await res.json();
    const weatherCode: number = data.weather?.[0]?.id ?? 800;
    const condition: string = data.weather?.[0]?.main ?? "Clear";
    const emoji = conditionToEmoji(weatherCode);

    return NextResponse.json({
      temp: Math.round(data.main.temp),
      condition,
      emoji,
      humidity: data.main.humidity,
      feelsLike: Math.round(data.main.feels_like),
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
      source: "live",
    });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({
      temp: 82,
      condition: "Partly Cloudy",
      emoji: "⛅",
      humidity: 65,
      feelsLike: 85,
      high: 86,
      low: 74,
      source: "static",
    });
  }
}
