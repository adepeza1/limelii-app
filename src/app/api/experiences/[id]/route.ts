import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/xano";

// GET /api/experiences/[id] — public, no auth required
// Fetches a single experience by ID for deep-link pages.
// Requires Xano endpoint: GET /experiences/{id}
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const res = await fetch(`${API_BASE}/experiences/${id}`, { cache: "no-store" });

  if (res.status === 404) {
    return NextResponse.json({ error: "Experience not found" }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load experience" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
