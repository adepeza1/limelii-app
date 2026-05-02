import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

async function getCurrentUserId(): Promise<number | null> {
  const meRes = await apiFetch("/user/me", {}, USER_API_BASE);
  if (!meRes.ok) return null;
  const me = await meRes.json();
  return typeof me?.id === "number" ? me.id : null;
}

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
  if (!Number.isFinite(blockedId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const currentUserId = await getCurrentUserId();
  if (currentUserId == null) {
    return NextResponse.json({ error: "Failed to identify current user" }, { status: 401 });
  }
  if (currentUserId === blockedId) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  // Check if already blocked to keep this idempotent
  const listRes = await apiFetch("/user_blocks");
  if (listRes.ok) {
    const all = await listRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = Array.isArray(all)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? all.find((b: any) => b.blocker_id === currentUserId && b.blocked_id === blockedId)
      : null;
    if (existing) {
      return NextResponse.json({ blocked: true });
    }
  }

  const res = await apiFetch("/user_blocks", {
    method: "POST",
    body: JSON.stringify({ blocker_id: currentUserId, blocked_id: blockedId }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn("[block] POST /user_blocks failed:", res.status, err);
    return NextResponse.json({ error: "Failed to block user" }, { status: res.status });
  }

  return NextResponse.json({ blocked: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const blockedId = parseInt(id, 10);
  if (!Number.isFinite(blockedId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const currentUserId = await getCurrentUserId();
  if (currentUserId == null) {
    return NextResponse.json({ error: "Failed to identify current user" }, { status: 401 });
  }

  const listRes = await apiFetch("/user_blocks");
  if (!listRes.ok) {
    return NextResponse.json({ error: "Failed to fetch blocks" }, { status: listRes.status });
  }
  const all = await listRes.json();

  const matches = Array.isArray(all)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? all.filter((b: any) => b.blocker_id === currentUserId && b.blocked_id === blockedId)
    : [];

  if (matches.length === 0) {
    return NextResponse.json({ blocked: false });
  }

  const results = await Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matches.map((b: any) => apiFetch(`/user_blocks/${b.id}`, { method: "DELETE" }))
  );

  const anyFailed = results.some((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
  if (anyFailed) {
    return NextResponse.json({ error: "Failed to unblock user" }, { status: 500 });
  }

  return NextResponse.json({ blocked: false });
}
