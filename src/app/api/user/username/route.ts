import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const res = await apiFetch("/user/update_username", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
