import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function GET() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await apiFetch("/following_collections");

  if (!res.ok) {
    return NextResponse.json([], { status: 200 });
  }

  const raw = await res.json();
  console.log("[following_collections] response:", JSON.stringify(raw).slice(0, 500));
  // Unwrap common Xano response shapes (plain array or wrapped object)
  const data = Array.isArray(raw)
    ? raw
    : (raw?.result ?? raw?.items ?? raw?.data ?? raw?.collections ?? []);
  return NextResponse.json(Array.isArray(data) ? data : []);
}
