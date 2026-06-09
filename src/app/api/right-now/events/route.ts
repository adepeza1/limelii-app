import { NextRequest, NextResponse } from "next/server";
import type { RightNowCard } from "@/lib/right-now/types";

// Proxies the Ticketmaster Discovery API server-side so the key never reaches
// the client. Returns events starting within the next `hours` window near the
// given location, normalized into RightNowCard shape.
//
// Requires TICKETMASTER_API_KEY in the environment (see .env.example).

const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";

interface TMImage { ratio?: string; width?: number; url: string }
interface TMEvent {
  id: string;
  name: string;
  url: string;
  images?: TMImage[];
  dates?: { start?: { dateTime?: string }; status?: { code?: string } };
  priceRanges?: { min?: number }[];
  classifications?: { segment?: { name?: string }; genre?: { name?: string } }[];
  _embedded?: { venues?: { name?: string; city?: { name?: string }; location?: { latitude?: string; longitude?: string } }[] };
}

function pickImage(images?: TMImage[]): string | undefined {
  if (!images?.length) return undefined;
  const wide = images
    .filter((i) => i.ratio === "16_9" && i.url)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return (wide ?? images.find((i) => i.url))?.url;
}

function toCard(ev: TMEvent): RightNowCard {
  const venue = ev._embedded?.venues?.[0];
  const lat = venue?.location?.latitude ? Number(venue.location.latitude) : undefined;
  const lng = venue?.location?.longitude ? Number(venue.location.longitude) : undefined;
  const statusCode = ev.dates?.status?.code;
  const ticketsAvailable = statusCode !== "offsale" && statusCode !== "cancelled";
  const segment = ev.classifications?.[0]?.genre?.name ?? ev.classifications?.[0]?.segment?.name;
  return {
    id: `event:${ev.id}`,
    category: "events",
    title: ev.name,
    subtitle: segment,
    imageUrl: pickImage(ev.images),
    neighborhood: venue?.name,
    lat,
    lng,
    priceIndicator: undefined,
    availability: {
      startsAt: ev.dates?.start?.dateTime,
      ticketsAvailable,
      priceFrom: ev.priceRanges?.[0]?.min,
    },
    sourceType: "ticketmaster",
    action: { label: "Get Tickets", url: ev.url },
  };
}

export async function GET(request: NextRequest) {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) {
    // No key configured locally — return empty so the rest of the feed still works.
    return NextResponse.json({ items: [], warning: "TICKETMASTER_API_KEY not set" });
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") ?? "2";
  const hours = Number(searchParams.get("hours") ?? "24");

  const now = new Date();
  const end = new Date(now.getTime() + hours * 3600_000);
  const iso = (d: Date) => d.toISOString().split(".")[0] + "Z";

  const params = new URLSearchParams({
    apikey: key,
    startDateTime: iso(now),
    endDateTime: iso(end),
    sort: "date,asc",
    size: "40",
    unit: "miles",
  });
  if (lat && lng) {
    params.set("latlong", `${lat},${lng}`);
    params.set("radius", radius);
  } else {
    params.set("city", "New York");
  }

  try {
    const res = await fetch(`${TM_BASE}?${params.toString()}`, {
      // Cache briefly to stay well under the daily rate limit during dev.
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json({ items: [], warning: `Ticketmaster ${res.status}` }, { status: 200 });
    }
    const data = await res.json();
    const events: TMEvent[] = data?._embedded?.events ?? [];
    return NextResponse.json({ items: events.map(toCard) });
  } catch {
    return NextResponse.json({ items: [], warning: "Ticketmaster fetch failed" }, { status: 200 });
  }
}
