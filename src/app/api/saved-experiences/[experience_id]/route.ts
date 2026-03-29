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

  // Delete all records matching this experience, plus any corrupted records (experiences_id=0)
  const toDelete = records.filter((r) => r.experiences_id === expId || r.experiences_id === 0);

  if (toDelete.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  await Promise.all(
    toDelete.map((r) => apiFetch(`/saved_experiences/${r.id}`, { method: "DELETE" }))
  );

  return new NextResponse(null, { status: 204 });
}
