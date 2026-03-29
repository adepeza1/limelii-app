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

  const listRes = await apiFetch("/saved_experiences");
  if (!listRes.ok) {
    return NextResponse.json({ error: "Failed to look up saved experience" }, { status: listRes.status });
  }

  const records: { id: number; experiences_id: number | { id: number } }[] = await listRes.json();

  // Xano reference fields may return the full object or just the ID
  const getExpId = (r: { experiences_id: number | { id: number } }): number => {
    if (typeof r.experiences_id === "object" && r.experiences_id !== null) {
      return r.experiences_id.id;
    }
    return r.experiences_id as number;
  };

  const toDelete = records.filter((r) => {
    const id = getExpId(r);
    return id === expId || id === 0;
  });

  if (toDelete.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const results = await Promise.all(
    toDelete.map((r) => apiFetch(`/saved_experiences/${r.id}`, { method: "DELETE" }))
  );

  // 404 = already deleted (acceptable), anything else non-2xx is a real failure
  const failures = results.filter((r) => !r.ok && r.status !== 404);
  if (failures.length > 0) {
    const statuses = failures.map((r) => r.status).join(", ");
    console.error(`[unsave] Xano DELETE failed with statuses: ${statuses}`);
    return NextResponse.json({ error: `Failed to delete (statuses: ${statuses})` }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
