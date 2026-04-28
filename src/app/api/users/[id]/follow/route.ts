import { getKindeServerSession } from "@/lib/server-auth";
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
  const targetId = parseInt(id, 10);

  // Get current user's Xano ID so we can set follower_id explicitly
  // (MAIN API token doesn't carry auth context, so Xano can't auto-populate it)
  const meRes = await apiFetch("/user/me", {}, USER_API_BASE);
  if (!meRes.ok) {
    return NextResponse.json({ error: "Failed to identify current user" }, { status: meRes.status });
  }
  const me = await meRes.json();
  const currentUserId: number = me.id;

  // Get current follow records and filter to only this user's
  const listRes = await apiFetch("/user_follows");
  if (!listRes.ok) {
    return NextResponse.json({ error: "Failed to fetch follows" }, { status: listRes.status });
  }
  const allFollows = await listRes.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const follows = Array.isArray(allFollows) ? allFollows.filter((f: any) => f.follower_id === currentUserId) : [];

  // Clean up corrupt records (null following_id) for this user
  const nullRecords = follows.filter((f: any) => !f.following_id); // eslint-disable-line @typescript-eslint/no-explicit-any
  await Promise.allSettled(
    nullRecords.map((f: any) => apiFetch(`/user_follows/${f.id}`, { method: "DELETE" })) // eslint-disable-line @typescript-eslint/no-explicit-any
  );

  // Find existing follow record for this target user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = follows.find((f: any) => f.following_id === targetId) ?? null;

  if (existing) {
    // Already following → unfollow (DELETE)
    const delRes = await apiFetch(`/user_follows/${existing.id}`, { method: "DELETE" });
    if (!delRes.ok) {
      return NextResponse.json({ error: "Failed to unfollow" }, { status: delRes.status });
    }
    return NextResponse.json({ following: false });
  } else {
    // Not following → follow (POST), explicitly pass follower_id
    const addRes = await apiFetch("/user_follows", {
      method: "POST",
      body: JSON.stringify({ follower_id: currentUserId, following_id: targetId }),
    });
    if (!addRes.ok) {
      const errBody = await addRes.text();
      console.log("[follow] POST /user_follows failed:", addRes.status, errBody);
      return NextResponse.json({ error: "Failed to follow" }, { status: addRes.status });
    }
    return NextResponse.json({ following: true });
  }
}
