import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

// POST /api/experiences/[id]/share-to-user
// Body: { recipient_user_id: number }
// Requires Xano: POST /experiences/{id}/share_to_user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { recipient_user_id } = await request.json();
  if (!recipient_user_id) {
    return NextResponse.json({ error: "recipient_user_id is required" }, { status: 400 });
  }

  // The MAIN API token doesn't carry auth context, so Xano can't auto-populate
  // the sender. Derive it from /user/me and pass it explicitly.
  const meRes = await apiFetch("/user/me", {}, USER_API_BASE);
  if (!meRes.ok) {
    return NextResponse.json({ error: "Failed to identify current user" }, { status: meRes.status });
  }
  const me = await meRes.json();
  const shared_by_user_id: number = me.id;

  const res = await apiFetch(`/experiences/${id}/share_to_user`, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id, shared_by_user_id }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn("[share-experience] Xano failed:", res.status, err);
    return NextResponse.json({ error: "Failed to share experience" }, { status: res.status });
  }
  return NextResponse.json(await res.json().catch(() => ({ success: true })));
}
