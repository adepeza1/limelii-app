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
      return (r.experiences_id as { id: number }).id;
    }
    return r.experiences_id as number;
  };

  const toDelete = records.filter((r) => {
    const id = getExpId(r);
    return id === expId || id === 0;
  });

  // Diagnostic: always return what we found so we can debug
  if (toDelete.length === 0) {
    return NextResponse.json({
      debug: true,
      expId,
      recordCount: records.length,
      sample: records.slice(0, 3).map((r) => ({ rowId: r.id, expId: getExpId(r), raw: r.experiences_id })),
      message: "No matching records found",
    }, { status: 404 });
  }

  const results = await Promise.all(
    toDelete.map(async (r) => {
      const res = await apiFetch(`/saved_experiences/${r.id}`, { method: "DELETE" });
      return { rowId: r.id, status: res.status, ok: res.ok };
    })
  );

  const failures = results.filter((r) => !r.ok && r.status !== 404);
  if (failures.length > 0) {
    return NextResponse.json({ debug: true, results, error: "Some deletes failed" }, { status: 500 });
  }

  return NextResponse.json({ debug: true, deleted: results });
}
