import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";

export async function GET() {
  const res = await apiFetch("/user/me", {}, USER_API_BASE);
  if (!res.ok) {
    return NextResponse.json({ error: "Failed to load user" }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function PATCH(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const res = await apiFetch("/user/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  }, USER_API_BASE);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function DELETE() {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await apiFetch("/user/me", { method: "DELETE" }, USER_API_BASE);
  if (!res.ok) {
    console.warn("[delete account] Xano DELETE /user/me failed:", res.status);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete("xano_token");
  response.cookies.delete("xano_session");
  return response;
}
