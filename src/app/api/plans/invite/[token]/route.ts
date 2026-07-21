import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/xano";

// GET /api/plans/invite/[token] — public invite preview (no auth required —
// the token is the grant). Lets the invite screen show the plan title + who's
// going before the user logs in / commits.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const res = await fetch(
    `${API_BASE}/plans/invite/${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );

  if (res.status === 404) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load invite" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
