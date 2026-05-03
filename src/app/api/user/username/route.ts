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

  if (typeof body?.username === "string") {
    const validation = validateUsername(body.username);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.message, reason: validation.reason },
        { status: 400 },
      );
    }
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
