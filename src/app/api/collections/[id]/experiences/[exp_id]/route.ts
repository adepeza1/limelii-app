import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exp_id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, exp_id } = await params;
  const expId = parseInt(exp_id, 10);

  // Read current IDs from request body (avoids a GET round-trip)
  let ids: number[] = [];
  try {
    const body = await request.json();
    const current = body.current_experience_ids;
    if (Array.isArray(current)) ids = current;
    else if (typeof current === "string") {
      try { ids = JSON.parse(current); } catch { ids = []; }
    }
  } catch { /* no body — ids stays empty */ }

  // Remove the target experience
  ids = ids.filter((i) => i !== expId);

  // PATCH the collection with the updated experience_ids string
  const patchRes = await apiFetch(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ experience_ids: JSON.stringify(ids) }),
  });

  if (!patchRes.ok) {
    return NextResponse.json({ error: "Failed to remove experience" }, { status: patchRes.status });
  }

  return NextResponse.json(await patchRes.json());
}
