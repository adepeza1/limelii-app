import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const res = await apiFetch(`/collections/${id}/toggle_like`, { method: "POST" });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to toggle like" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
