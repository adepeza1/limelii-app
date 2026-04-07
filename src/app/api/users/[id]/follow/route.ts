import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const targetId = parseInt(id, 10);

  // Get current follow records for the authenticated user
  const listRes = await apiFetch("/user_follows");
  if (!listRes.ok) {
    return NextResponse.json({ error: "Failed to fetch follows" }, { status: listRes.status });
  }
  const follows = await listRes.json();
  console.log("[follow] user_follows list:", JSON.stringify(follows).slice(0, 500));

  // Find existing follow record for this target user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = Array.isArray(follows) ? follows.find((f: any) => f.following_id === targetId) : null;

  if (existing) {
    // Already following → unfollow (DELETE)
    const delRes = await apiFetch(`/user_follows/${existing.id}`, { method: "DELETE" });
    if (!delRes.ok) {
      return NextResponse.json({ error: "Failed to unfollow" }, { status: delRes.status });
    }
    return NextResponse.json({ following: false });
  } else {
    // Not following → follow (POST)
    const addRes = await apiFetch("/user_follows", {
      method: "POST",
      body: JSON.stringify({ following_id: targetId }),
    });
    if (!addRes.ok) {
      const errBody = await addRes.text();
      console.log("[follow] POST /user_follows failed:", addRes.status, errBody);
      return NextResponse.json({ error: "Failed to follow" }, { status: addRes.status });
    }
    const addData = await addRes.json();
    console.log("[follow] created record:", JSON.stringify(addData));
    return NextResponse.json({ following: true });
  }
}
