import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { API_BASE, USER_API_BASE } from "@/lib/xano";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current user's Xano ID to filter follows correctly
  const meRes = await apiFetch("/user/me", {}, USER_API_BASE);
  if (!meRes.ok) return NextResponse.json([]);
  const me = await meRes.json();
  const currentUserId: number = me.id;

  // Get all user_follows and filter to only this user's records
  const followsRes = await apiFetch("/user_follows");
  if (!followsRes.ok) return NextResponse.json([]);
  const allFollows = await followsRes.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myFollows = Array.isArray(allFollows) ? allFollows.filter((f: any) => f.follower_id === currentUserId) : [];

  // Extract valid following_ids
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followingIds: number[] = myFollows.map((f: any) => f.following_id).filter(Boolean);

  if (followingIds.length === 0) return NextResponse.json([]);

  // Fetch all public collections (same endpoint Browse tab uses)
  const colRes = await fetch(`${API_BASE}/public_collections`, { cache: "no-store" });
  if (!colRes.ok) return NextResponse.json([]);
  const allCollections = await colRes.json();

  // Filter to collections owned by followed users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = Array.isArray(allCollections)
    ? allCollections.filter((col: any) => {
        const ownerId = col._users?.id ?? col.users_id ?? col.owner_user_id;
        return ownerId && followingIds.includes(ownerId);
      })
    : [];

  return NextResponse.json(result);
}
