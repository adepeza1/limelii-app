import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

// GET — list collections the current user saved via a private share link
export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await apiFetch("/shared_collections");
  if (!res.ok) return NextResponse.json([], { status: res.status });
  return NextResponse.json(await res.json());
}

// POST — save a collection to the current user's shared list (called from /c/[token] page)
export async function POST(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { collection_id } = await request.json();
  if (!collection_id) {
    return NextResponse.json({ error: "collection_id is required" }, { status: 400 });
  }

  const res = await apiFetch("/shared_collections", {
    method: "POST",
    body: JSON.stringify({ collection_id }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
