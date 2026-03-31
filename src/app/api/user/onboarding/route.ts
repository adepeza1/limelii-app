import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

export async function POST() {
  const res = await apiFetch("/user/complete_onboarding", { method: "PATCH" }, USER_API_BASE);
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
