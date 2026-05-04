import { getKindeServerSession } from "@/lib/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { USER_API_BASE } from "@/lib/xano";
import { validateUsername } from "@/lib/username-validation";

export async function PATCH(request: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const submitted = typeof body?.username === "string" ? body.username : "";

  // Reject reserved + profane usernames server-side too, so the rule
  // can't be bypassed by hitting this route directly.
  const validation = validateUsername(submitted);
  if (!validation.ok) {
    return NextResponse.json({ message: validation.reason }, { status: 400 });
  }

  const res = await apiFetch("/user/update_username", {
    method: "PATCH",
    body: JSON.stringify(body),
  }, USER_API_BASE);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
