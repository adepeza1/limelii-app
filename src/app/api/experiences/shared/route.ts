import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// GET /api/experiences/shared
// Returns experiences shared with the current user by others.
// Requires Xano: GET /shared_experiences
export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json([], { status: 401 });
  }

  const res = await apiFetch("/shared_experiences");
  if (!res.ok) return NextResponse.json([]);
  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data : []);
}
