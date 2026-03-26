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
  const { experience_id } = await request.json();

  // 1. Fetch the current collection to get its experience_ids
  const getRes = await apiFetch(`/collections/${id}`);
  if (!getRes.ok) {
    return NextResponse.json({ error: "Collection not found" }, { status: getRes.status });
  }
  const collection = await getRes.json();

  // 2. Parse experience_ids (Xano stores it as a JSON text string)
  let ids: number[] = [];
  if (Array.isArray(collection.experience_ids)) {
    ids = collection.experience_ids;
  } else if (typeof collection.experience_ids === "string") {
    try { ids = JSON.parse(collection.experience_ids); } catch { ids = []; }
  }

  // 3. Append if not already present
  if (!ids.includes(experience_id)) {
    ids = [...ids, experience_id];
  }

  // 4. PATCH the collection with the updated experience_ids string
  const patchRes = await apiFetch(`/collections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ experience_ids: JSON.stringify(ids) }),
  });

  if (!patchRes.ok) {
    const errBody = await patchRes.text();
    console.error("[add-experience] Xano PATCH error:", patchRes.status, errBody);
    return NextResponse.json({ error: "Failed to add experience" }, { status: patchRes.status });
  }

  return NextResponse.json(await patchRes.json());
}
