import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ experience_id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { experience_id } = await params;
  const expId = parseInt(experience_id, 10);

  // Find the saved_experiences record ID for this experience
  const listRes = await apiFetch("/saved_experiences");
  if (!listRes.ok) {
    return NextResponse.json({ error: "Failed to look up saved experience" }, { status: listRes.status });
  }

  const records: { id: number; experiences_id: number }[] = await listRes.json();
  const record = records.find((r) => r.experiences_id === expId);

  if (!record) {
    // Already unsaved — treat as success
    return new NextResponse(null, { status: 204 });
  }

  // Delete by the Xano record ID
  const delRes = await apiFetch(`/saved_experiences/${record.id}`, { method: "DELETE" });
  if (!delRes.ok) {
    return NextResponse.json({ error: "Failed to unsave experience" }, { status: delRes.status });
  }

  return new NextResponse(null, { status: 204 });
}
