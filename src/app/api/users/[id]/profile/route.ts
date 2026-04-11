import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { API_BASE } from "@/lib/xano";

// GET /api/users/[id]/profile — public profile by username
// [id] is actually the username string here
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: username } = await params;

  const res = await fetch(
    `${API_BASE}/users/by_username/${encodeURIComponent(username)}`,
    { cache: "no-store" }
  );

  if (res.status === 404) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
