import { NextRequest, NextResponse } from "next/server";
import { API_BASE } from "@/lib/xano";

// Public endpoint — returns a user's public collections by username
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const res = await fetch(`${API_BASE}/public_collections`, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: res.status });
  }

  const all = await res.json();
  const collections = Array.isArray(all)
    ? all.filter((c: { _users?: { username?: string } }) =>
        c._users?.username?.toLowerCase() === username.toLowerCase()
      )
    : [];

  return NextResponse.json(collections);
}
