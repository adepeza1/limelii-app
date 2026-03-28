import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function GET() {
  const res = await apiFetch("/user/me");
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load user" }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
