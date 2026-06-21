import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/xano";

// GET /api/world-cup/featured — public, no auth required.
//
// Proxies the Xano endpoint that returns *today's* World Cup matches.
// "Today" is decided server-side by Xano in the America/New_York timezone
// (see worldcup-endpoints-guide.md) so every user — regardless of their
// device clock or timezone — sees the same correct day's matches.
//
// Shape returned by Xano:
//   { date: "2026-06-21", matches: [ { experience_id, headline,
//     kickoff_local, venue, experience: <full Experience> }, ... ] }
//
// On an off day (no matches) Xano returns { date, matches: [] } and the
// Discover banner hides itself. Any upstream failure also degrades to an
// empty list so a backend hiccup never breaks the home feed.
export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/world-cup/featured`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ date: null, matches: [] });
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ date: null, matches: [] });
  }
}
