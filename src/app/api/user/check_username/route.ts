import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ available: false });
  }

  const res = await apiFetch(`/user/check_username?username=${encodeURIComponent(username)}`, {}, USER_API_BASE);

  // If request failed entirely, don't block the user — assume available
  if (!res.ok) {
    console.error("[check_username] Xano error:", res.status);
    return NextResponse.json({ available: true });
  }

  const data = await res.json();

  // Handle different Xano response formats:
  // 1. { available: true/false }
  // 2. Array of matching records — empty = available
  // 3. { result: true/false } or { exists: true/false }
  if (typeof data?.available === "boolean") {
    return NextResponse.json({ available: data.available });
  }
  if (Array.isArray(data)) {
    return NextResponse.json({ available: data.length === 0 });
  }
  if (typeof data?.exists === "boolean") {
    return NextResponse.json({ available: !data.exists });
  }
  if (typeof data?.result === "boolean") {
    return NextResponse.json({ available: data.result });
  }

  // Fallback: if we got a response but can't parse it, assume available
  console.error("[check_username] unexpected response format:", JSON.stringify(data));
  return NextResponse.json({ available: true });
}
