import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch, API_BASE } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Fetch without auth so Xano returns public collections to anyone, not just the owner
  const res = await fetch(`${API_BASE}/collections/${id}`, { cache: "no-store" });

  if (!res.ok) {
    return NextResponse.json({ error: "Collection not found" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

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
  const res = await apiFetch(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to update collection" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
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
  const res = await apiFetch(`/collections/${id}`, { method: "DELETE" });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to delete collection" }, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
