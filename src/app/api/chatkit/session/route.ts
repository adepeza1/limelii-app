import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";
const WORKFLOW_ID = "wf_68fa1b3a99a0819092c78d5609fdf82b0ce8a22ab95aa142";

export async function POST(req: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    console.error("chatkit/session: Kinde not authenticated");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const xanoToken = cookieStore.get("xano_token")?.value;

  if (!xanoToken) {
    console.error("chatkit/session: No xano_token cookie found");
    return NextResponse.json(
      { error: "No Xano token — please log in again" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const res = await fetch(
    `${API_BASE}/chatkit/token?workflow_id=${WORKFLOW_ID}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xanoToken}`,
      },
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
