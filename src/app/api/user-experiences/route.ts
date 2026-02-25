import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = "https://xyhl-mgrz-aokj.n7c.xano.io/api:58lfyMpE";

export async function GET() {
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

  const res = await fetch(`${API_BASE}/user_experiences`, {
    headers: {
      Authorization: `Bearer ${xanoToken}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch experiences" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
