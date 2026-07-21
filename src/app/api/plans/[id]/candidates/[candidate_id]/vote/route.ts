import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// POST /api/plans/[id]/candidates/[candidate_id]/vote — toggle the caller's vote
// Returns { voted: boolean, vote_count: number }
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; candidate_id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, candidate_id } = await params;
  const res = await apiFetch(`/plans/${id}/candidates/${candidate_id}/vote`, {
    method: "POST",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to vote" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
