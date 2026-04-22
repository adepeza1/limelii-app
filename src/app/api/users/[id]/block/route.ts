import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const blockedId = parseInt(id, 10);

  const meRes = await apiFetch("/user/me", {}, USER_API_BASE);
  if (!meRes.ok) {
    return NextResponse.json({ error: "Failed to identify current user" }, { status: meRes.status });
  }
  const me = await meRes.json();

  const res = await apiFetch("/user_blocks", {
    method: "POST",
    body: JSON.stringify({ blocker_id: me.id, blocked_id: blockedId }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn("[block] Xano /user_blocks failed:", res.status, err);
  }

  return NextResponse.json({ success: true });
}
