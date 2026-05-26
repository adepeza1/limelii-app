import { NextRequest, NextResponse } from "next/server";
import type { WeatherCondition } from "@/lib/atmosphere-config";
import { mapConditionCode } from "@/lib/weather";
import { API_BASE } from "@/lib/xano";

const NYC_LAT = 40.7128;
const NYC_LON = -74.006;

// Xano endpoint that signs the Apple WeatherKit JWT, calls WeatherKit, and
// caches by geo-cell. NOTE: this must be a published Xano *API endpoint*
// (under the /api:58lfyMpE group), not an internal Function. Confirm the slug
// matches what you exposed in Xano.
const WEATHER_ENDPOINT = `${API_BASE}/get_current_weather`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLat = parseFloat(searchParams.get("lat") ?? "");
  const rawLon = parseFloat(searchParams.get("lon") ?? "");
  const lat = isNaN(rawLat) ? NYC_LAT : rawLat;
  const lon = isNaN(rawLon) ? NYC_LON : rawLon;

  try {
    // Xano expects `lng`; the client hook sends `lon`.
    const url = `${WEATHER_ENDPOINT}?lat=${lat}&lng=${lon}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Xano weather ${res.status}`);
    const body = await res.json();

    const condition: WeatherCondition = mapConditionCode(body?.condition);
    const tempF: number | null = typeof body?.temp_f === "number" ? body.temp_f : null;
    return NextResponse.json({ condition, tempF });
  } catch {
    // Graceful fallback — UI treats this as "no weather signal" (neutral).
    return NextResponse.json({ condition: "clear" as WeatherCondition, tempF: null });
  }
}
