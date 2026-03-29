import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await apiFetch("/saved_experiences");
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load saved experiences" }, { status: res.status });
  }

  const records: { id: number; experiences_id: number }[] = await res.json();

  // Auto-delete corrupted records (experiences_id=0) from old bug, return only valid ones
  const bad = records.filter((r) => r.experiences_id === 0);
  if (bad.length > 0) {
    await Promise.all(
      bad.map((r) => apiFetch(`/saved_experiences/${r.id}`, { method: "DELETE" }).catch(() => {}))
    );
  }

  return NextResponse.json(records.filter((r) => r.experiences_id !== 0));
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { experience_id } = await request.json();

  const res = await apiFetch("/saved_experiences", {
    method: "POST",
    body: JSON.stringify({ experiences_id: experience_id }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to save experience" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
