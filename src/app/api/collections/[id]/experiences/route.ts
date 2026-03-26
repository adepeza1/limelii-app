import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { experience_id, current_experience_ids } = await request.json();

  // Parse current experience_ids sent from client (avoids a GET round-trip)
  let ids: number[] = [];
  if (Array.isArray(current_experience_ids)) {
    ids = current_experience_ids;
  } else if (typeof current_experience_ids === "string") {
    try { ids = JSON.parse(current_experience_ids); } catch { ids = []; }
  }

  // Append if not already present
  if (!ids.includes(experience_id)) {
    ids = [...ids, experience_id];
  }

  // PATCH the collection with the updated experience_ids string
  const patchRes = await apiFetch(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ experience_ids: JSON.stringify(ids) }),
  });

  if (!patchRes.ok) {
    const errBody = await patchRes.text();
    return NextResponse.json({ error: "Failed to add experience", xano_status: patchRes.status, xano_error: errBody }, { status: patchRes.status });
  }

  return NextResponse.json(await patchRes.json());
}
