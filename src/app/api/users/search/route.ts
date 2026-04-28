import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// GET /api/users/search?q=<query>
// Searches users by username or name.
// Requires Xano endpoint: GET /users/search?q=<query>
export async function GET(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json([], { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const res = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return NextResponse.json([]);
  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}
