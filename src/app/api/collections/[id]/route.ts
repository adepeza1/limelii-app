import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch, API_BASE } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Try authenticated first — Xano only joins _experiences when a valid token is present.
  // Fall back to unauthenticated if the user isn't logged in (e.g. share-link previews).
  const { isAuthenticated } = getKindeServerSession();
  let res: Response;
  if (await isAuthenticated()) {
    res = await apiFetch(`/collections/${id}`);
  } else {
    res = await fetch(`${API_BASE}/collections/${id}`, { cache: "no-store" });
  }

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
