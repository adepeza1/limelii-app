import { getKindeServerSession } from "@/lib/server-auth";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ blockedIds: [], blocked: [] }, { status: 401 });
  }

  const meRes = await apiFetch("/user/me", {}, USER_API_BASE);
  if (!meRes.ok) return NextResponse.json({ blockedIds: [], blocked: [] });
  const me = await meRes.json();
  const currentUserId: number = me.id;

  const blocksRes = await apiFetch("/user_blocks");
  if (!blocksRes.ok) return NextResponse.json({ blockedIds: [], blocked: [] });
  const allBlocks = await blocksRes.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myBlocks: any[] = Array.isArray(allBlocks)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? allBlocks.filter((b: any) => b.blocker_id === currentUserId && b.blocked_id)
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blockedIds: number[] = myBlocks.map((b: any) => b.blocked_id as number);

  // Pass through whatever Xano returned for each row, including any joined
  // user fields (e.g. _users / _blocked_user). The client renders defensively.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocked = myBlocks.map((b: any) => ({
    id: b.id,
    blocked_id: b.blocked_id,
    user: b._blocked_user ?? b._users ?? b.user ?? null,
  }));

  return NextResponse.json({ blockedIds, blocked });
}
