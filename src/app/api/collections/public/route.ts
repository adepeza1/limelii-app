import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/xano";

// Public endpoint — no auth required, returns all public collections with owner info
export async function GET() {
  const res = await fetch(`${API_BASE}/public_collections`, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch public collections" }, { status: res.status });
  }
  const data = await res.json();
  // Temporary: log first item keys to diagnose username field structure
  if (Array.isArray(data) && data.length > 0) {
    console.log("[public_collections] first item keys:", Object.keys(data[0]));
    console.log("[public_collections] first item:", JSON.stringify(data[0]).slice(0, 500));
  }
  return NextResponse.json(data);
}
