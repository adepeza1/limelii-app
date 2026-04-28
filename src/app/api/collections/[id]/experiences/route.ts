import { getKindeServerSession } from "@/lib/server-auth";
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
  const { experience_id, current_experience_ids, collection_name } = await request.json();

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

  // Xano PATCH requires name alongside any update — fetch it if not supplied by client
  let name: string = collection_name ?? "";
  if (!name) {
    const getRes = await apiFetch(`/collections/${id}`);
    if (getRes.ok) {
      const col = await getRes.json();
      name = col.name ?? "";
    }
  }

  // PATCH the collection with the updated experience_ids string
  const patchRes = await apiFetch(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, experience_ids: JSON.stringify(ids) }),
  });

  if (!patchRes.ok) {
    const errBody = await patchRes.text();
    return NextResponse.json({ error: "Failed to add experience", xano_status: patchRes.status, xano_error: errBody }, { status: patchRes.status });
  }

  return NextResponse.json(await patchRes.json());
}
