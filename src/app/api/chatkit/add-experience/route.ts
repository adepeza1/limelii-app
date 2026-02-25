import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";

export async function POST(req: NextRequest) {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const xanoToken = cookieStore.get("xano_token")?.value;

  if (!xanoToken) {
    return NextResponse.json(
      { error: "No Xano token — please log in again" },
      { status: 401 }
    );
  }

  const body = await req.json();

  const res = await fetch(`${API_BASE}/chatkit/add_experience`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${xanoToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to add experience" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
