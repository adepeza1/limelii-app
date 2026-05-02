import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// POST /api/experiences/[id]/share-to-user
// Body: { recipient_user_id: number }
// Calls Xano POST /experiences/{id}/share_to_user, which derives the sender
// from $auth.id internally — so we forward the recipient only.
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

  const res = await apiFetch(`/experiences/${id}/share_to_user`, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
    console.warn("[share-experience] Xano failed:", res.status, text.slice(0, 500));
    const xanoMsg =
      (parsed && typeof parsed === "object" && (parsed as { message?: string }).message) ||
      text ||
      "Failed to share experience";
    return NextResponse.json({ error: xanoMsg, xano: parsed ?? text }, { status: res.status });
  }
  return NextResponse.json(await res.json().catch(() => ({ success: true })));
}
