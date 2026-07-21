import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// GET /api/plans — list the caller's plans
export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await apiFetch("/plans");
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

// POST /api/plans — create a plan
export async function POST(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const res = await apiFetch("/plans", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    return NextResponse.json(
      { error: "Failed to create plan", xano_status: res.status, xano_error: errBody },
      { status: res.status }
    );
  }

  return NextResponse.json(await res.json());
}
