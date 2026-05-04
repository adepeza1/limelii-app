import { NextRequest, NextResponse } from "next/server";
import { getKindeServerSession } from "@/lib/server-auth";
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

  // Xano doesn't expose a generic PATCH /user/me — name updates go through
  // the dedicated /user/update_name endpoint (mirrors /user/update_username).
  // That endpoint expects first_name + last_name separately, so split the
  // single `name` field the UI sends.
  let path = "/user/me";
  let payload: Record<string, unknown> = body;
  if (body && typeof body === "object" && typeof (body as { name?: unknown }).name === "string") {
    const fullName = (body as { name: string }).name.trim();
    const parts = fullName.split(/\s+/);
    const firstname = parts[0] ?? "";
    const lastname = parts.slice(1).join(" ") || ".";
    path = "/user/update_name";
    payload = { firstname, lastname };
  }

  const res = await apiFetch(path, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, USER_API_BASE);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
    console.warn(`[PATCH ${path}] Xano failed:`, res.status, text.slice(0, 500));
    const xanoMsg =
      (parsed && typeof parsed === "object" && (parsed as { message?: string }).message) ||
      text ||
      "Failed to update profile";
    return NextResponse.json({ error: xanoMsg, xano: parsed ?? text }, { status: res.status });
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
    const detail = await res.text().catch(() => "");
    console.warn("[delete account] Xano DELETE /user/me failed:", res.status, detail);
    // Do NOT clear cookies if Xano deletion failed — the account still exists
    // and clearing the session would just log the user out without deleting
    // their data, which would be a real privacy/compliance bug.
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: res.status }
    );
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete("xano_token");
  response.cookies.delete("xano_session");
  return response;
}
