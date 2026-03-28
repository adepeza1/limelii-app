import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ available: false });
  }

  const res = await apiFetch(`/user/check_username?username=${encodeURIComponent(username)}`);
  if (!res.ok) {
    return NextResponse.json({ available: false });
  }

  return NextResponse.json(await res.json());
}
