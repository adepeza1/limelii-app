import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// POST /api/plans/[id]/join — accept an invite
// Body: { share_token: string }. Xano validates the token against the plan and
// derives the joining user from $auth.id, so we forward only the token.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { share_token } = await request.json();
  if (!share_token) {
    return NextResponse.json({ error: "share_token is required" }, { status: 400 });
  }

  const res = await apiFetch(`/plans/${id}/join`, {
    method: "POST",
    body: JSON.stringify({ share_token }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to join plan" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
