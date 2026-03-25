import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await apiFetch("/collections");
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

export async function POST(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const res = await apiFetch("/collections", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to create collection" }, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
