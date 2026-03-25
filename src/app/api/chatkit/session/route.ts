import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { apiFetch } from "@/lib/api";

const WORKFLOW_ID = "wf_68fa1b3a99a0819092c78d5609fdf82b0ce8a22ab95aa142";

export async function POST(req: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    console.error("chatkit/session: Kinde not authenticated");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const res = await apiFetch(
    `/chatkit/token?workflow_id=${WORKFLOW_ID}`,
    {
      method: "POST",
      body: body.currentClientSecret
        ? JSON.stringify({ currentClientSecret: body.currentClientSecret })
        : undefined,
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to create chatkit session" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
