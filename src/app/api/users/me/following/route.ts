import { getKindeServerSession } from "@/lib/server-auth";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ followingIds: [] }, { status: 401 });
  }

  const meRes = await apiFetch("/user/me", {}, USER_API_BASE);
  if (!meRes.ok) return NextResponse.json({ followingIds: [] });
  const me = await meRes.json();
  const currentUserId: number = me.id;

  const followsRes = await apiFetch("/user_follows");
  if (!followsRes.ok) return NextResponse.json({ followingIds: [] });
  const allFollows = await followsRes.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followingIds: number[] = Array.isArray(allFollows)
    ? allFollows
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((f: any) => f.follower_id === currentUserId && f.following_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((f: any) => f.following_id as number)
    : [];

  return NextResponse.json({ followingIds });
}
