import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

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

  const res = await apiFetch(`/experiences/${id}/share_to_user`, {
    method: "POST",
    body: JSON.stringify({ recipient_user_id }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
