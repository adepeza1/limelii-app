import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const res = await apiFetch(`/experiences/${id}`, { method: "DELETE" });

  if (!res.ok && res.status !== 404) {
    return NextResponse.json({ error: "Failed to delete experience" }, { status: res.status });
  }

  return NextResponse.json({ success: true });
}
