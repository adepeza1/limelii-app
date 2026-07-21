import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// POST /api/plans/[id]/candidates — suggest an experience or place
// Body: { experience_id?: number, place_id?: number, note?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  if (!body?.experience_id && !body?.place_id) {
    return NextResponse.json(
      { error: "experience_id or place_id is required" },
      { status: 400 }
    );
  }

  const res = await apiFetch(`/plans/${id}/candidates`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to add suggestion" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
