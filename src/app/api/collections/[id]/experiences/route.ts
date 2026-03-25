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
  const body = await request.json();
  const res = await apiFetch(`/collections/${id}/experiences`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to add experience" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
