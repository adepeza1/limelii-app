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

  return NextResponse.json(await res.json());
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { experience_id } = await request.json();

  const res = await apiFetch("/saved_experiences", {
    method: "POST",
    body: JSON.stringify({ experience_id }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to save experience" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
