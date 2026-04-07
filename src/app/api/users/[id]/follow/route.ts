import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const res = await apiFetch(`/users/${id}/follow`, { method: "POST" });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to toggle follow" }, { status: res.status });
  }

  const data = await res.json();
  console.log("[follow] Xano response:", JSON.stringify(data).slice(0, 300));
  return NextResponse.json(data);
}
