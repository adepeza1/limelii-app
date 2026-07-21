import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// DELETE /api/plans/[id]/candidates/[candidate_id]
// Xano enforces: only the adder or the plan owner may remove a candidate.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; candidate_id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, candidate_id } = await params;
  const res = await apiFetch(`/plans/${id}/candidates/${candidate_id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to remove suggestion" }, { status: res.status });
  }

  return new NextResponse(null, { status: 204 });
}
