import { NextRequest, NextResponse } from "next/server";
import type { WeatherCondition } from "@/lib/atmosphere-config";

const NYC_LAT = 40.7128;
const NYC_LON = -74.006;

// V1: only rain (5xx) and snow (6xx) are distinct; everything else → clear
function mapWeatherId(id: number): WeatherCondition {
  if (id >= 500 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  return "clear";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLat = parseFloat(searchParams.get("lat") ?? "");
  const rawLon = parseFloat(searchParams.get("lon") ?? "");
  const lat = isNaN(rawLat) ? NYC_LAT : rawLat;
  const lon = isNaN(rawLon) ? NYC_LON : rawLon;

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ condition: "clear" as WeatherCondition, tempF: null });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`OpenWeather ${res.status}`);
    const body = await res.json();
    const condition = mapWeatherId(body.weather?.[0]?.id ?? 800);
    const tempF: number | null = body.main?.temp ?? null;
    return NextResponse.json({ condition, tempF });
  } catch {
    return NextResponse.json({ condition: "clear" as WeatherCondition, tempF: null });
  }
}
