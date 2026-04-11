import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// GET /api/users/me/following/profiles
// Returns full user objects (id, username, name, photo) for people the current user follows.
// Requires Xano endpoint: GET /following_users
export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json([], { status: 401 });
  }

  const res = await apiFetch("/following_users");
  if (!res.ok) return NextResponse.json([]);
  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}
