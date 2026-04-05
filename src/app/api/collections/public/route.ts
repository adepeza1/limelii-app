import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/xano";

// Public endpoint — no auth required, returns all public collections with owner info
export async function GET() {
  const res = await fetch(`${API_BASE}/public_collections`, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch public collections" }, { status: res.status });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
