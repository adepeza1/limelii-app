import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch, API_BASE } from "@/lib/api";

// GET /api/users/[id]/profile — public profile by username
// [id] is actually the username string here
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: username } = await params;

  // Use auth when available so Xano populates _experiences on collections.
  const { isAuthenticated } = getKindeServerSession();
  let res: Response;
  if (await isAuthenticated()) {
    res = await apiFetch(`/users/by_username/${encodeURIComponent(username)}`);
  } else {
    res = await fetch(
      `${API_BASE}/users/by_username/${encodeURIComponent(username)}`,
      { cache: "no-store" }
    );
  }

  if (res.status === 404) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
