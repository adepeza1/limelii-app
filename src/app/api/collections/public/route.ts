import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/xano";
import { getKindeServerSession } from "@/lib/server-auth";
import { getMyBlockedIdSet } from "@/lib/blocked-server";

// Public endpoint — no auth required, returns all public collections with owner info.
// When the viewer is signed in, we additionally drop collections owned by users
// they've blocked.
export async function GET() {
  const res = await fetch(`${API_BASE}/public_collections`, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch public collections" }, { status: res.status });
  }
  const data = await res.json();
  if (!Array.isArray(data)) return NextResponse.json(data);

  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) return NextResponse.json(data);

  const blocked = await getMyBlockedIdSet();
  if (blocked.size === 0) return NextResponse.json(data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = data.filter((col: any) => {
    const ownerId: number | undefined = col._users?.id ?? col.users_id ?? col.owner_user_id;
    return !(typeof ownerId === "number" && blocked.has(ownerId));
  });
  return NextResponse.json(filtered);
}
