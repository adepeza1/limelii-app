import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// GET /api/plans/[id] — full plan detail (members + candidates + votes)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const res = await apiFetch(`/plans/${id}`);
  if (!res.ok) {
    return NextResponse.json({ error: "Plan not found" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

// PATCH /api/plans/[id] — update title / date / lock (owner only, enforced by Xano)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const res = await apiFetch(`/plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to update plan" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

// DELETE /api/plans/[id] — owner only, enforced by Xano
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const res = await apiFetch(`/plans/${id}`, { method: "DELETE" });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to delete plan" }, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
