import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { API_BASE } from "@/lib/xano";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${API_BASE}/collections/${id}/comments`);

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { text } = await request.json();

  const res = await apiFetch(`/collections/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to post comment" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
