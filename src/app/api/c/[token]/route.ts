import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/xano";

// GET /api/c/[token] — public, no auth required — token is the access grant
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const res = await fetch(
    `${API_BASE}/share/${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );

  if (res.status === 404) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load collection" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
