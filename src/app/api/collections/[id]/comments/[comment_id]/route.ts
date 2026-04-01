import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; comment_id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { comment_id } = await params;
  const res = await apiFetch(`/collection_comments/${comment_id}`, { method: "DELETE" });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: "Failed to delete comment", xano_error: body }, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
