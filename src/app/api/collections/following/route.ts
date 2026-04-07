import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { API_BASE } from "@/lib/xano";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 1: get the current user's follow records
  const followsRes = await apiFetch("/user_follows");
  if (!followsRes.ok) return NextResponse.json([]);
  const follows = await followsRes.json();

  // Step 2: extract valid following_ids
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followingIds: number[] = Array.isArray(follows)
    ? follows.map((f: any) => f.following_id).filter(Boolean)
    : [];

  if (followingIds.length === 0) return NextResponse.json([]);

  // Step 3: fetch all public collections (same endpoint Browse tab uses)
  const colRes = await fetch(`${API_BASE}/public_collections`, { cache: "no-store" });
  if (!colRes.ok) return NextResponse.json([]);
  const allCollections = await colRes.json();

  // Step 4: filter to collections owned by followed users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = Array.isArray(allCollections)
    ? allCollections.filter((col: any) => {
        const ownerId = col._users?.id ?? col.users_id ?? col.owner_user_id;
        return ownerId && followingIds.includes(ownerId);
      })
    : [];

  return NextResponse.json(result);
}
