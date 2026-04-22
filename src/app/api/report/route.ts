import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function POST(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, target_id, reason, note } = body;

  if (!type || !target_id || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const res = await apiFetch("/reports", {
    method: "POST",
    body: JSON.stringify({ type, target_id, reason, note: note ?? "" }),
  });

  if (!res.ok) {
    // Log but return success — UI should not fail if Xano table isn't set up yet
    const err = await res.text();
    console.warn("[report] Xano /reports failed:", res.status, err);
  }

  return NextResponse.json({ success: true });
}
