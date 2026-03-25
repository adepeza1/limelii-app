import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; exp_id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, exp_id } = await params;
  const res = await apiFetch(`/collections/${id}/experiences/${exp_id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to remove experience" }, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
